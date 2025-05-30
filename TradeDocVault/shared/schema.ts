import { pgTable, text, serial, integer, jsonb, timestamp, boolean, decimal, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bank: text("bank").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileUrl: text("file_url"),
  classification: text("classification"),
  classificationConfidence: decimal("classification_confidence", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("uploaded"), // uploaded, processing, classified, extracted, flagged, completed
  processingError: text("processing_error"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const shippingBillData = pgTable("shipping_bill_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  sbNumber: jsonb("sb_number").$type<{value: string, confidence: string}>(),
  sbDate: jsonb("sb_date").$type<{value: string, confidence: string}>(),
  cbName: jsonb("cb_name").$type<{value: string, confidence: string}>(),
  portOfLoading: jsonb("port_of_loading").$type<{value: string, confidence: string}>(),
  hawbNumber: jsonb("hawb_number").$type<{value: string, confidence: string}>(),
  iecNumber: jsonb("iec_number").$type<{value: string, confidence: string}>(),
  portOfFinalDestination: jsonb("port_of_final_destination").$type<{value: string, confidence: string}>(),
  accountNumber: jsonb("account_number").$type<{value: string, confidence: string}>(),
  invoiceTerm: jsonb("invoice_term").$type<{value: string, confidence: string}>(),
  fobValue: jsonb("fob_value").$type<Array<{currency: string, value: string, confidence: string}>>(),
  exporterNameAddress: jsonb("exporter_name_address").$type<{value: string, confidence: string}>(),
  consigneeNameAddress: jsonb("consignee_name_address").$type<{value: string, confidence: string}>(),
  invoices: jsonb("invoices").$type<Array<{
    invoice_number: {value: string, confidence: string},
    invoice_date: {value: string, confidence: string},
    invoice_value: {value: string, confidence: string}
  }>>(),
  adCode: jsonb("ad_code").$type<{value: string, confidence: string}>(),
  buyerNameAddress: jsonb("buyer_name_address").$type<{value: string, confidence: string}>(),
  freight: jsonb("freight").$type<{value: string, confidence: string}>(),
  insurance: jsonb("insurance").$type<{value: string, confidence: string}>(),
  discount: jsonb("discount").$type<{value: string, confidence: string}>(),
  commission: jsonb("commission").$type<{value: string, confidence: string}>(),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

export const invoiceData = pgTable("invoice_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  invoiceNumber: jsonb("invoice_number").$type<{value: string, confidence: string}>(),
  invoiceDate: jsonb("invoice_date").$type<{value: string, confidence: string}>(),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

export const logisticsData = pgTable("logistics_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  primaryTransportId: jsonb("primary_transport_id").$type<{value: string, confidence: string}>(),
  shippingBillNumber: jsonb("shipping_bill_number").$type<{value: string, confidence: string}>(),
  invoiceNumber: jsonb("invoice_number").$type<{value: string, confidence: string}>(),
  documentDate: jsonb("document_date").$type<{value: string, confidence: string}>(),
  transportTypeDetected: text("transport_type_detected"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

export const firaFircData = pgTable("fira_firc_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  provider: jsonb("provider").$type<{value: string, confidence: string}>(),
  utrNumber: jsonb("utr_number").$type<{value: string, confidence: string}>(),
  date: jsonb("date").$type<{value: string, confidence: string}>(),
  totalSettlementAmountInr: jsonb("total_settlement_amount_inr").$type<{value: string, confidence: string}>(),
  accountNumber: jsonb("account_number").$type<{value: string, confidence: string}>(),
  remitter: jsonb("remitter").$type<{value: string, confidence: string}>(),
  receiver: jsonb("receiver").$type<{value: string, confidence: string}>(),
  purposeCode: jsonb("purpose_code").$type<{value: string, confidence: string}>(),
  transactionBreakup: jsonb("transaction_breakup").$type<Array<{
    reference_no: {value: string, confidence: string},
    buyer_name: {value: string, confidence: string},
    buyer_address: {value: string, confidence: string},
    buyer_country: {value: string, confidence: string},
    date: {value: string, confidence: string},
    amount_inr: {value: string, confidence: string},
    amount_foreign_currency: {value: string, confidence: string},
    currency: {value: string, confidence: string}
  }>>(),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

export const documentFlags = pgTable("document_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  issueType: text("issue_type").notNull(), // "Not Specified", "Low Confidence"
  fieldName: text("field_name"),
  currentValue: text("current_value"),
  correctedValue: text("corrected_value"),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const manualCorrections = pgTable("manual_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  fieldName: text("field_name").notNull(),
  originalValue: text("original_value"),
  correctedValue: text("corrected_value").notNull(),
  correctedBy: text("corrected_by").notNull(),
  correctedAt: timestamp("corrected_at").defaultNow().notNull(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  documents: many(documents),
  shippingBillData: many(shippingBillData),
  invoiceData: many(invoiceData),
  logisticsData: many(logisticsData),
  firaFircData: many(firaFircData),
  documentFlags: many(documentFlags),
  manualCorrections: many(manualCorrections),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  customer: one(customers, {
    fields: [documents.customerId],
    references: [customers.id],
  }),
  shippingBillData: many(shippingBillData),
  invoiceData: many(invoiceData),
  logisticsData: many(logisticsData),
  firaFircData: many(firaFircData),
  documentFlags: many(documentFlags),
  manualCorrections: many(manualCorrections),
}));

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const insertDocumentFlagSchema = createInsertSchema(documentFlags).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertManualCorrectionSchema = createInsertSchema(manualCorrections).omit({
  id: true,
  correctedAt: true,
});

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type ShippingBillData = typeof shippingBillData.$inferSelect;
export type InvoiceData = typeof invoiceData.$inferSelect;
export type LogisticsData = typeof logisticsData.$inferSelect;
export type FiraFircData = typeof firaFircData.$inferSelect;
export type DocumentFlag = typeof documentFlags.$inferSelect;
export type InsertDocumentFlag = z.infer<typeof insertDocumentFlagSchema>;
export type ManualCorrection = typeof manualCorrections.$inferSelect;
export type InsertManualCorrection = z.infer<typeof insertManualCorrectionSchema>;
