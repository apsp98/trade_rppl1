import { claudeService } from './claude';
import { storage } from '../storage';
import { Document, InsertDocumentFlag } from '@shared/schema';
import { fileUploadService } from './file-upload';

export class DocumentProcessor {
  async processDocument(document: Document, documentContent: string): Promise<void> {
    try {
      console.log(`Processing document ${document.id}: ${document.originalName}`);
      console.log(`Document content length: ${documentContent.length} characters`);
      console.log(`Document content preview: ${documentContent.substring(0, 200)}...`);
      
      // Step 1: Always use vision-based processing for PDFs (like Claude does)
      let images: string[] | undefined;
      let useVision = false;
      
      if (document.filename.toLowerCase().endsWith('.pdf')) {
        try {
          console.log(`PDF detected - using vision approach like Claude (processing PDF as images)`);
          const filePath = `uploads/${document.filename}`;
          images = await fileUploadService.convertPdfToImages(filePath);
          useVision = true;
          console.log(`Successfully converted PDF to ${images.length} images for vision processing`);
          
          // For PDFs, we'll rely on vision instead of text extraction
          // This mimics how Claude processes PDFs - as images, not raw text
          console.log(`Using vision-based processing instead of text extraction for reliability`);
        } catch (visionError) {
          console.log(`Vision processing failed, falling back to text extraction:`, visionError);
          useVision = false;
        }
      }
      
      // Step 2: Classify document
      await storage.updateDocument(document.id, { status: 'processing' });
      
      // For PDFs with vision, pass minimal text content and rely primarily on images
      const contentForClassification = useVision ? 
        `PDF Document (processed via vision like Claude)\nText preview: ${documentContent.substring(0, 200)}...` : 
        documentContent;
      
      const classificationResult = await claudeService.classifyDocument(contentForClassification, images);
      console.log(`Classification result for ${document.id}:`, classificationResult);
      
      await storage.updateDocument(document.id, {
        classification: classificationResult.classification,
        classificationConfidence: classificationResult.confidence.toString(),
        status: 'classified'
      });

      // Check if classification is "Not Specified"
      if (classificationResult.classification === 'Not Specified') {
        await this.flagDocument(document, 'Not Specified', 'Document Type', 'Not Specified');
        await storage.updateDocument(document.id, { status: 'flagged' });
        return;
      }

      // Step 3: Extract fields based on classification
      let extractionResult;
      
      // For vision processing, provide context about the processing method
      const contentForExtraction = useVision ? 
        `PDF Document (Vision Processing Mode - like Claude)\nExtracted text reference: ${documentContent.substring(0, 500)}...` : 
        documentContent;

      switch (classificationResult.classification) {
        case 'Shipping Bill':
          extractionResult = await claudeService.extractShippingBillFields(contentForExtraction, images);
          console.log(`Extraction result for shipping bill ${document.id}:`, extractionResult);
          await this.saveShippingBillData(document, extractionResult.extractedData);
          break;
        case 'Invoice':
          extractionResult = await claudeService.extractInvoiceFields(contentForExtraction, images);
          await this.saveInvoiceData(document, extractionResult.extractedData);
          break;
        case 'Logistics Document':
          extractionResult = await claudeService.extractLogisticsFields(contentForExtraction, images);
          await this.saveLogisticsData(document, extractionResult.extractedData);
          break;
        case 'FIRA/FIRC':
          extractionResult = await claudeService.extractFiraFircFields(contentForExtraction, images);
          await this.saveFiraFircData(document, extractionResult.extractedData);
          break;
        default:
          await this.flagDocument(document, 'Not Specified', 'Document Type', classificationResult.classification);
          await storage.updateDocument(document.id, { status: 'flagged' });
          return;
      }

      // Step 4: Check confidence levels and flag low confidence fields
      await this.checkAndFlagLowConfidence(document, extractionResult.extractedData);

      await storage.updateDocument(document.id, { 
        status: 'completed',
        processedAt: new Date()
      });

    } catch (error) {
      console.error('Document processing error:', error);
      await storage.updateDocument(document.id, {
        status: 'flagged',
        processingError: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async flagDocument(
    document: Document, 
    issueType: string, 
    fieldName: string, 
    currentValue: string
  ): Promise<void> {
    const flag: InsertDocumentFlag = {
      documentId: document.id,
      customerId: document.customerId,
      issueType,
      fieldName,
      currentValue
    };
    
    await storage.createDocumentFlag(flag);
  }

  private async checkAndFlagLowConfidence(document: Document, extractedData: any): Promise<void> {
    const checkField = async (fieldName: string, fieldData: any) => {
      if (fieldData && fieldData.confidence === 'Low') {
        await this.flagDocument(
          document,
          'Low Confidence',
          fieldName,
          fieldData.value || 'N/A'
        );
      }
    };

    // Check all fields recursively
    const processData = async (data: any, prefix = '') => {
      for (const [key, value] of Object.entries(data)) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              await processData(value[i], `${fieldName}[${i}]`);
            }
          } else if (value.confidence !== undefined) {
            await checkField(fieldName, value);
          } else {
            await processData(value, fieldName);
          }
        }
      }
    };

    await processData(extractedData);
  }

  private async saveShippingBillData(document: Document, extractedData: any): Promise<void> {
    const data = {
      documentId: document.id,
      customerId: document.customerId,
      sbNumber: extractedData.sb_number,
      sbDate: extractedData.sb_date,
      cbName: extractedData.cb_name,
      portOfLoading: extractedData.port_of_loading,
      hawbNumber: extractedData.hawb_number,
      iecNumber: extractedData.iec_number,
      portOfFinalDestination: extractedData.port_of_final_destination,
      accountNumber: extractedData.account_number,
      invoiceTerm: extractedData.invoice_term,
      fobValue: extractedData.fob_value,
      exporterNameAddress: extractedData.exporter_name_address,
      consigneeNameAddress: extractedData.consignee_name_address,
      invoices: extractedData.invoices,
      adCode: extractedData.ad_code,
      buyerNameAddress: extractedData.buyer_name_address,
      freight: extractedData.freight,
      insurance: extractedData.insurance,
      discount: extractedData.discount,
      commission: extractedData.commission
    };

    console.log(`Saving shipping bill data for ${document.id}:`, data);
    await storage.createShippingBillData(data);
    console.log(`Successfully saved shipping bill data for ${document.id}`);
  }

  private async saveInvoiceData(document: Document, extractedData: any): Promise<void> {
    const data = {
      documentId: document.id,
      customerId: document.customerId,
      invoiceNumber: extractedData.invoice_number,
      invoiceDate: extractedData.invoice_date
    };

    await storage.createInvoiceData(data);
  }

  private async saveLogisticsData(document: Document, extractedData: any): Promise<void> {
    const data = {
      documentId: document.id,
      customerId: document.customerId,
      primaryTransportId: extractedData.primary_transport_id,
      shippingBillNumber: extractedData.shipping_bill_number,
      invoiceNumber: extractedData.invoice_number,
      documentDate: extractedData.document_date,
      transportTypeDetected: extractedData.transport_type_detected
    };

    await storage.createLogisticsData(data);
  }

  private async saveFiraFircData(document: Document, extractedData: any): Promise<void> {
    const data = {
      documentId: document.id,
      customerId: document.customerId,
      provider: extractedData.provider,
      utrNumber: extractedData.utr_number,
      date: extractedData.date,
      totalSettlementAmountInr: extractedData.total_settlement_amount_inr,
      accountNumber: extractedData.account_number,
      remitter: extractedData.remitter,
      receiver: extractedData.receiver,
      purposeCode: extractedData.purpose_code,
      transactionBreakup: extractedData.transaction_breakup
    };

    await storage.createFiraFircData(data);
  }
}

export const documentProcessor = new DocumentProcessor();
