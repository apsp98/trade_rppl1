export interface ConfidenceField<T = string> {
  value: T;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface Customer {
  id: number;
  name: string;
  bank: string;
  createdAt: string;
}

export interface Document {
  id: string;
  customerId: number;
  filename: string;
  originalName: string;
  fileUrl?: string;
  classification?: string;
  classificationConfidence?: string;
  status: string;
  processingError?: string;
  uploadedAt: string;
  processedAt?: string;
}

export interface DocumentFlag {
  id: string;
  documentId: string;
  customerId: number;
  issueType: string;
  fieldName?: string;
  currentValue?: string;
  correctedValue?: string;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface ShippingBillData {
  id: string;
  documentId: string;
  customerId: number;
  sbNumber?: ConfidenceField;
  sbDate?: ConfidenceField;
  cbName?: ConfidenceField;
  portOfLoading?: ConfidenceField;
  hawbNumber?: ConfidenceField;
  iecNumber?: ConfidenceField;
  portOfFinalDestination?: ConfidenceField;
  accountNumber?: ConfidenceField;
  invoiceTerm?: ConfidenceField;
  fobValue?: Array<{
    currency: string;
    value: string;
    confidence: 'High' | 'Medium' | 'Low';
  }>;
  exporterNameAddress?: ConfidenceField;
  consigneeNameAddress?: ConfidenceField;
  invoices?: Array<{
    invoice_number: ConfidenceField;
    invoice_date: ConfidenceField;
    invoice_value: ConfidenceField;
  }>;
  adCode?: ConfidenceField;
  buyerNameAddress?: ConfidenceField;
  freight?: ConfidenceField;
  insurance?: ConfidenceField;
  discount?: ConfidenceField;
  commission?: ConfidenceField;
  extractedAt: string;
}

export interface InvoiceData {
  id: string;
  documentId: string;
  customerId: number;
  invoiceNumber?: ConfidenceField;
  invoiceDate?: ConfidenceField;
  extractedAt: string;
}

export interface LogisticsData {
  id: string;
  documentId: string;
  customerId: number;
  primaryTransportId?: ConfidenceField;
  shippingBillNumber?: ConfidenceField;
  invoiceNumber?: ConfidenceField;
  documentDate?: ConfidenceField;
  transportTypeDetected?: string;
  extractedAt: string;
}

export interface FiraFircData {
  id: string;
  documentId: string;
  customerId: number;
  provider?: ConfidenceField;
  utrNumber?: ConfidenceField;
  date?: ConfidenceField;
  totalSettlementAmountInr?: ConfidenceField;
  accountNumber?: ConfidenceField;
  remitter?: ConfidenceField;
  receiver?: ConfidenceField;
  purposeCode?: ConfidenceField;
  transactionBreakup?: Array<{
    reference_no: ConfidenceField;
    buyer_name: ConfidenceField;
    buyer_address: ConfidenceField;
    buyer_country: ConfidenceField;
    date: ConfidenceField;
    amount_inr: ConfidenceField;
    amount_foreign_currency: ConfidenceField;
    currency: ConfidenceField;
  }>;
  extractedAt: string;
}
