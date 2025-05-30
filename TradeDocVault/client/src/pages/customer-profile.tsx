import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building, CheckCircle, Upload } from "lucide-react";
import { DocumentUpload } from "@/components/document-upload";
import { DocumentFlags } from "@/components/document-flags";
import { DataTables } from "@/components/data-tables";
import { useCustomer } from "@/hooks/use-customers";
import { useDocuments } from "@/hooks/use-documents";

interface CustomerProfileProps {
  customerId: number;
  onBack: () => void;
}

export function CustomerProfile({ customerId, onBack }: CustomerProfileProps) {
  const { data: customer, isLoading: loadingCustomer } = useCustomer(customerId);
  const { data: documents } = useDocuments(customerId);

  if (loadingCustomer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">Loading...</div>
          <div className="text-gray-500">Fetching customer profile</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">Customer not found</div>
          <Button onClick={onBack} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onBack}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-gray-600">{customer.bank}</p>
                <p className="text-sm text-gray-500">
                  Customer ID: {customer.id}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-4 h-4 mr-1" />
                Active
              </Badge>
              <div className="text-right text-sm text-gray-500">
                <div>Customer since</div>
                <div>{new Date(customer.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="shipment-data" className="flex items-center">
            <Building className="w-4 h-4 mr-2" />
            Shipment Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <DocumentUpload customerId={customerId} />
          <DocumentFlags customerId={customerId} />
          
          {/* Recent Documents */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
              {!documents || documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.slice(0, 6).map((doc) => (
                    <div key={doc.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Building className="w-5 h-5 text-red-500" />
                        <Badge 
                          variant="secondary" 
                          className={
                            doc.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-gray-900 text-sm mb-1">
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {doc.classification || 'Processing...'}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipment-data">
          <DataTables customerId={customerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
