import { 
  customers, 
  documents, 
  shippingBillData, 
  invoiceData, 
  logisticsData, 
  firaFircData, 
  documentFlags, 
  manualCorrections,
  type Customer, 
  type InsertCustomer,
  type Document,
  type InsertDocument,
  type ShippingBillData,
  type InvoiceData,
  type LogisticsData,
  type FiraFircData,
  type DocumentFlag,
  type InsertDocumentFlag,
  type ManualCorrection,
  type InsertManualCorrection
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  
  // Document operations
  getDocumentsByCustomer(customerId: number): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  
  // Extracted data operations
  getShippingBillDataByCustomer(customerId: number): Promise<ShippingBillData[]>;
  getInvoiceDataByCustomer(customerId: number): Promise<InvoiceData[]>;
  getLogisticsDataByCustomer(customerId: number): Promise<LogisticsData[]>;
  getFiraFircDataByCustomer(customerId: number): Promise<FiraFircData[]>;
  
  createShippingBillData(data: any): Promise<ShippingBillData>;
  createInvoiceData(data: any): Promise<InvoiceData>;
  createLogisticsData(data: any): Promise<LogisticsData>;
  createFiraFircData(data: any): Promise<FiraFircData>;
  
  // Document flags operations
  getDocumentFlagsByCustomer(customerId: number): Promise<DocumentFlag[]>;
  createDocumentFlag(flag: InsertDocumentFlag): Promise<DocumentFlag>;
  resolveDocumentFlag(id: string): Promise<DocumentFlag>;
  
  // Manual corrections
  createManualCorrection(correction: InsertManualCorrection): Promise<ManualCorrection>;
  getManualCorrectionsByDocument(documentId: string): Promise<ManualCorrection[]>;
}

export class DatabaseStorage implements IStorage {
  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(insertCustomer)
      .returning();
    return customer;
  }

  // Document operations
  async getDocumentsByCustomer(customerId: number): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.customerId, customerId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  // Extracted data operations
  async getShippingBillDataByCustomer(customerId: number): Promise<ShippingBillData[]> {
    return await db
      .select()
      .from(shippingBillData)
      .where(eq(shippingBillData.customerId, customerId))
      .orderBy(desc(shippingBillData.extractedAt));
  }

  async getInvoiceDataByCustomer(customerId: number): Promise<InvoiceData[]> {
    return await db
      .select()
      .from(invoiceData)
      .where(eq(invoiceData.customerId, customerId))
      .orderBy(desc(invoiceData.extractedAt));
  }

  async getLogisticsDataByCustomer(customerId: number): Promise<LogisticsData[]> {
    return await db
      .select()
      .from(logisticsData)
      .where(eq(logisticsData.customerId, customerId))
      .orderBy(desc(logisticsData.extractedAt));
  }

  async getFiraFircDataByCustomer(customerId: number): Promise<FiraFircData[]> {
    return await db
      .select()
      .from(firaFircData)
      .where(eq(firaFircData.customerId, customerId))
      .orderBy(desc(firaFircData.extractedAt));
  }

  async createShippingBillData(data: any): Promise<ShippingBillData> {
    const [result] = await db
      .insert(shippingBillData)
      .values(data)
      .returning();
    return result;
  }

  async createInvoiceData(data: any): Promise<InvoiceData> {
    const [result] = await db
      .insert(invoiceData)
      .values(data)
      .returning();
    return result;
  }

  async createLogisticsData(data: any): Promise<LogisticsData> {
    const [result] = await db
      .insert(logisticsData)
      .values(data)
      .returning();
    return result;
  }

  async createFiraFircData(data: any): Promise<FiraFircData> {
    const [result] = await db
      .insert(firaFircData)
      .values(data)
      .returning();
    return result;
  }

  // Document flags operations
  async getDocumentFlagsByCustomer(customerId: number): Promise<DocumentFlag[]> {
    return await db
      .select()
      .from(documentFlags)
      .where(and(eq(documentFlags.customerId, customerId), eq(documentFlags.isResolved, false)))
      .orderBy(desc(documentFlags.createdAt));
  }

  async createDocumentFlag(flag: InsertDocumentFlag): Promise<DocumentFlag> {
    const [result] = await db
      .insert(documentFlags)
      .values(flag)
      .returning();
    return result;
  }

  async resolveDocumentFlag(id: string): Promise<DocumentFlag> {
    const [result] = await db
      .update(documentFlags)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(eq(documentFlags.id, id))
      .returning();
    return result;
  }

  // Manual corrections
  async createManualCorrection(correction: InsertManualCorrection): Promise<ManualCorrection> {
    const [result] = await db
      .insert(manualCorrections)
      .values(correction)
      .returning();
    return result;
  }

  async getManualCorrectionsByDocument(documentId: string): Promise<ManualCorrection[]> {
    return await db
      .select()
      .from(manualCorrections)
      .where(eq(manualCorrections.documentId, documentId))
      .orderBy(desc(manualCorrections.correctedAt));
  }
}

export const storage = new DatabaseStorage();
