import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCustomer } from "@/hooks/use-customers";
import { useToast } from "@/hooks/use-toast";

interface AddCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCustomerModal({ open, onOpenChange }: AddCustomerModalProps) {
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const createCustomer = useCreateCustomer();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !bank) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    try {
      await createCustomer.mutateAsync({ name: name.trim(), bank });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
      setName("");
      setBank("");
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create customer",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter customer name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bank">Bank</Label>
            <Select value={bank} onValueChange={setBank} required>
              <SelectTrigger>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HDFC Bank">HDFC Bank</SelectItem>
                <SelectItem value="ICICI Bank">ICICI Bank</SelectItem>
                <SelectItem value="State Bank of India">State Bank of India</SelectItem>
                <SelectItem value="Axis Bank">Axis Bank</SelectItem>
                <SelectItem value="Kotak Mahindra Bank">Kotak Mahindra Bank</SelectItem>
                <SelectItem value="Punjab National Bank">Punjab National Bank</SelectItem>
                <SelectItem value="Bank of Baroda">Bank of Baroda</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createCustomer.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createCustomer.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createCustomer.isPending ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
