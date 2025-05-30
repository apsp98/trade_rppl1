import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, FileText, Check, X } from "lucide-react";
import { useDocumentFlags, useResolveDocumentFlag } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";
import type { DocumentFlag } from "@/lib/types";

interface DocumentFlagsProps {
  customerId: number;
}

export function DocumentFlags({ customerId }: DocumentFlagsProps) {
  const { data: flags, isLoading } = useDocumentFlags(customerId);
  const resolveFlag = useResolveDocumentFlag();
  const { toast } = useToast();

  const handleResolve = async (flagId: string) => {
    try {
      await resolveFlag.mutateAsync(flagId);
      toast({
        title: "Success",
        description: "Document flag resolved successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resolve document flag",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Flag className="w-5 h-5 mr-2 text-orange-500" />
            Document Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!flags || flags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Flag className="w-5 h-5 mr-2 text-orange-500" />
            Document Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No flags requiring review</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Flag className="w-5 h-5 mr-2 text-orange-500" />
            Document Flags
          </div>
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            {flags.length} items need review
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-red-500 mr-2" />
                      <span className="text-sm font-medium">
                        Document {flag.documentId ? flag.documentId.slice(0, 8) + '...' : 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={
                        flag.issueType === 'Not Specified' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {flag.issueType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {flag.fieldName || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {flag.issueType === 'Not Specified' && flag.fieldName === 'Document Type' ? (
                      <Select defaultValue={flag.currentValue || ''}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Invoice">Invoice</SelectItem>
                          <SelectItem value="Shipping Bill">Shipping Bill</SelectItem>
                          <SelectItem value="Logistics Document">Logistics Document</SelectItem>
                          <SelectItem value="FIRA/FIRC">FIRA/FIRC</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        defaultValue={flag.currentValue || ''} 
                        className="w-full"
                        placeholder="Enter correct value"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleResolve(flag.id)}
                        disabled={resolveFlag.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
