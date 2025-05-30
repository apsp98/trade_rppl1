import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { fileUploadService } from "./services/file-upload";
import { documentProcessor } from "./services/document-processor";
import { insertCustomerSchema, insertDocumentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const upload = fileUploadService.getMulterConfig();

  // Customer routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid customer data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create customer" });
      }
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      const customer = await storage.getCustomer(customerId);
      
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // Document routes
  app.get("/api/customers/:customerId/documents", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const documents = await storage.getDocumentsByCustomer(customerId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/customers/:customerId/documents", upload.array('files'), async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedDocuments = [];

      for (const file of files) {
        const documentData = {
          customerId,
          filename: file.filename,
          originalName: file.originalname,
          fileUrl: fileUploadService.getFileUrl(file.filename),
          status: "uploaded" as const
        };

        const document = await storage.createDocument(documentData);
        uploadedDocuments.push(document);

        // Process document asynchronously
        setImmediate(async () => {
          try {
            const content = await fileUploadService.readFileContent(file.path);
            await documentProcessor.processDocument(document, content);
          } catch (error) {
            console.error('Document processing failed:', error);
          }
        });
      }

      res.status(201).json(uploadedDocuments);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload documents" });
    }
  });

  // Document flags routes
  app.get("/api/customers/:customerId/document-flags", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const flags = await storage.getDocumentFlagsByCustomer(customerId);
      res.json(flags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document flags" });
    }
  });

  app.patch("/api/document-flags/:flagId/resolve", async (req, res) => {
    try {
      const flagId = req.params.flagId;
      const flag = await storage.resolveDocumentFlag(flagId);
      res.json(flag);
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve document flag" });
    }
  });

  // Debug endpoint to view API interactions
  app.get("/api/debug/claude-interactions", async (req, res) => {
    try {
      // This endpoint will show recent Claude API interactions from console logs
      // In a production system, you'd store these in a database
      res.json({ 
        message: "Check the server console for detailed Claude API interaction logs",
        note: "Look for '=== CLAUDE API INTERACTION ===' entries in the console output"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debug information" });
    }
  });

  // Extracted data routes
  app.get("/api/customers/:customerId/shipping-bills", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const data = await storage.getShippingBillDataByCustomer(customerId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch shipping bill data" });
    }
  });

  app.get("/api/customers/:customerId/invoices", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const data = await storage.getInvoiceDataByCustomer(customerId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice data" });
    }
  });

  app.get("/api/customers/:customerId/logistics", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const data = await storage.getLogisticsDataByCustomer(customerId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logistics data" });
    }
  });

  app.get("/api/customers/:customerId/transactions", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const data = await storage.getFiraFircDataByCustomer(customerId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction data" });
    }
  });

  // Manual corrections
  app.post("/api/manual-corrections", async (req, res) => {
    try {
      const correction = await storage.createManualCorrection(req.body);
      res.status(201).json(correction);
    } catch (error) {
      res.status(500).json({ error: "Failed to save manual correction" });
    }
  });

  // File serving
  app.get("/uploads/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      const filepath = `uploads/${filename}`;
      res.sendFile(filepath, { root: process.cwd() });
    } catch (error) {
      res.status(404).json({ error: "File not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
