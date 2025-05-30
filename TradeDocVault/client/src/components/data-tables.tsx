import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Search, FileText, Truck, DollarSign, ChevronDown, ChevronRight } from "lucide-react";
import { 
  useShippingBillData, 
  useInvoiceData, 
  useLogisticsData, 
  useTransactionData 
} from "@/hooks/use-documents";
import type { ConfidenceField } from "@/lib/types";

interface DataTablesProps {
  customerId: number;
}

function ConfidenceIndicator({ confidence }: { confidence?: 'High' | 'Medium' | 'Low' }) {
  if (!confidence) return null;
  
  const colors = {
    High: "bg-green-500",
    Medium: "bg-yellow-500", 
    Low: "bg-red-500"
  };
  
  return (
    <div 
      className={`w-2 h-2 rounded-full ml-2 ${colors[confidence]}`}
      title={`${confidence} Confidence`}
    />
  );
}

function FieldWithConfidence({ field }: { field?: ConfidenceField }) {
  if (!field) return <span className="text-gray-400">N/A</span>;
  
  return (
    <div className="flex items-center">
      <span className="text-sm">{field.value}</span>
      <ConfidenceIndicator confidence={field.confidence} />
    </div>
  );
}

export function DataTables({ customerId }: DataTablesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: shippingBillData, isLoading: loadingShippingBills } = useShippingBillData(customerId);
  const { data: invoiceData, isLoading: loadingInvoices } = useInvoiceData(customerId);
  const { data: logisticsData, isLoading: loadingLogistics } = useLogisticsData(customerId);
  const { data: transactionData, isLoading: loadingTransactions } = useTransactionData(customerId);

  const handleExport = (type: string) => {
    // CSV export functionality would be implemented here
    console.log(`Exporting ${type} data...`);
  };

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const renderAllFields = (data: any, excludeFields: string[] = []) => {
    const fields = Object.entries(data).filter(([key]) => 
      !excludeFields.includes(key) && 
      key !== 'id' && 
      key !== 'documentId' && 
      key !== 'customerId' && 
      key !== 'createdAt' && 
      key !== 'updatedAt'
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        {fields.map(([key, value]) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </label>
            {Array.isArray(value) ? (
              <div className="space-y-2">
                {value.map((item, index) => (
                  <div key={index} className="p-2 bg-white rounded border">
                    {typeof item === 'object' && item !== null ? (
                      <div className="space-y-1">
                        {Object.entries(item).map(([subKey, subValue]) => (
                          <div key={subKey} className="flex justify-between text-xs">
                            <span className="font-medium text-gray-600">{subKey}:</span>
                            <span>{typeof subValue === 'object' && subValue !== null ? 
                              (subValue as any).value || JSON.stringify(subValue) : 
                              String(subValue)
                            }</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm">{String(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : typeof value === 'object' && value !== null ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm">{(value as any).value || 'N/A'}</span>
                <ConfidenceIndicator confidence={(value as any).confidence} />
              </div>
            ) : (
              <span className="text-sm">{String(value) || 'N/A'}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Extracted Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="shipping-bills" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shipping-bills">
              Shipments ({shippingBillData?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              Invoices ({invoiceData?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="logistics">
              Logistics ({logisticsData?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions ({transactionData?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Table Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence Levels</SelectItem>
                  <SelectItem value="high">High Confidence</SelectItem>
                  <SelectItem value="medium">Medium Confidence</SelectItem>
                  <SelectItem value="low">Low Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={() => handleExport('shipping-bills')}
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <TabsContent value="shipping-bills">
            <div className="space-y-4">
              {loadingShippingBills ? (
                <div className="text-center py-8">Loading...</div>
              ) : !shippingBillData || shippingBillData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No shipping bill data available
                </div>
              ) : (
                shippingBillData.map((record) => (
                  <Collapsible key={record.id}>
                    <div className="border rounded-lg bg-white">
                      <CollapsibleTrigger 
                        className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => toggleRowExpansion(record.id)}
                      >
                        <div className="flex items-center space-x-4">
                          {expandedRows.has(record.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div className="flex items-center space-x-6">
                            <div>
                              <span className="font-medium">SB:</span>
                              <FieldWithConfidence field={record.sbNumber} />
                            </div>
                            <div>
                              <span className="font-medium">Date:</span>
                              <FieldWithConfidence field={record.sbDate} />
                            </div>
                            <div>
                              <span className="font-medium">Port:</span>
                              <FieldWithConfidence field={record.portOfLoading} />
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Processed
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {renderAllFields(record, ['sbNumber', 'sbDate', 'portOfLoading'])}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <div className="space-y-4">
              {loadingInvoices ? (
                <div className="text-center py-8">Loading...</div>
              ) : !invoiceData || invoiceData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No invoice data available
                </div>
              ) : (
                invoiceData.map((record) => (
                  <Collapsible key={record.id}>
                    <div className="border rounded-lg bg-white">
                      <CollapsibleTrigger 
                        className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => toggleRowExpansion(record.id)}
                      >
                        <div className="flex items-center space-x-4">
                          {expandedRows.has(record.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div className="flex items-center space-x-6">
                            <div>
                              <span className="font-medium">Invoice:</span>
                              <FieldWithConfidence field={record.invoiceNumber} />
                            </div>
                            <div>
                              <span className="font-medium">Date:</span>
                              <FieldWithConfidence field={record.invoiceDate} />
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Processed
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {renderAllFields(record, ['invoiceNumber', 'invoiceDate'])}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="logistics">
            <div className="space-y-4">
              {loadingLogistics ? (
                <div className="text-center py-8">Loading...</div>
              ) : !logisticsData || logisticsData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No logistics data available
                </div>
              ) : (
                logisticsData.map((record) => (
                  <Collapsible key={record.id}>
                    <div className="border rounded-lg bg-white">
                      <CollapsibleTrigger 
                        className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => toggleRowExpansion(record.id)}
                      >
                        <div className="flex items-center space-x-4">
                          {expandedRows.has(record.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div className="flex items-center space-x-6">
                            <div>
                              <span className="font-medium">Transport ID:</span>
                              <FieldWithConfidence field={record.primaryTransportId} />
                            </div>
                            <div>
                              <span className="font-medium">Type:</span>
                              {record.transportTypeDetected ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-2">
                                  {record.transportTypeDetected}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 ml-2">N/A</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Processed
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {renderAllFields(record, ['primaryTransportId', 'transportTypeDetected'])}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="space-y-4">
              {loadingTransactions ? (
                <div className="text-center py-8">Loading...</div>
              ) : !transactionData || transactionData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No transaction data available
                </div>
              ) : (
                transactionData.map((record) => (
                  <Collapsible key={record.id}>
                    <div className="border rounded-lg bg-white">
                      <CollapsibleTrigger 
                        className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => toggleRowExpansion(record.id)}
                      >
                        <div className="flex items-center space-x-4">
                          {expandedRows.has(record.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div className="flex items-center space-x-6">
                            <div>
                              <span className="font-medium">UTR:</span>
                              <FieldWithConfidence field={record.utrNumber} />
                            </div>
                            <div>
                              <span className="font-medium">Amount:</span>
                              <FieldWithConfidence field={record.totalSettlementAmountInr} />
                            </div>
                            <div>
                              <span className="font-medium">Remitter:</span>
                              <FieldWithConfidence field={record.remitter} />
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Processed
                        </Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {renderAllFields(record, ['utrNumber', 'totalSettlementAmountInr', 'remitter'])}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
