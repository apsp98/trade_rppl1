import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "",
});

export interface ClassificationResult {
  classification: string;
  confidence: number;
}

export interface ExtractionResult {
  extractedData: any;
  confidence: number;
}

export class ClaudeService {
  private logApiInteraction(operation: string, request: any, response?: any, error?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      operation,
      request: {
        model: request.model,
        max_tokens: request.max_tokens,
        system: request.system || 'none',
        prompt_length: request.messages?.[0]?.content?.length || 0,
        prompt_preview: request.messages?.[0]?.content?.substring(0, 200) + '...'
      },
      response: response ? {
        content_length: response.content?.[0]?.text?.length || 0,
        content_preview: response.content?.[0]?.text?.substring(0, 200) + '...',
        usage: response.usage
      } : null,
      error: error ? {
        message: error.message,
        type: error.constructor.name
      } : null
    };

    console.log('=== CLAUDE API INTERACTION ===');
    console.log(JSON.stringify(logEntry, null, 2));
    console.log('================================');
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`Claude API attempt ${attempt + 1}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`Claude API attempt ${attempt + 1} failed:`, error);
        if (attempt < maxRetries - 1) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.log(`Retrying in ${backoffMs}ms...`);
          await this.delay(backoffMs);
        }
      }
    }
    
    throw lastError!;
  }

  async classifyDocument(documentContent: string, images?: string[]): Promise<ClassificationResult> {
    const classificationPrompt = `You are a document classification specialist for trade compliance. Analyze the provided document and classify it into one of these EXACT categories:

**CLASSIFICATION OPTIONS:**
- Logistics Document
- Invoice
- Bank Statement
- Shipping Bill
- FIRA/FIRC
- Not Specified

**CLASSIFICATION RULES (Apply in Order):**
1. **FIRST CHECK FOR FIRA/FIRC:** If document contains ANY of these terms, classify as "FIRA/FIRC":
   - "FOREIGN INWARD REMITTANCE" or "FIRA" or "FIRC"
   - "PAYEE ADVICE" or "REMITTANCE ADVICE"
   - "UTR" or "UNIQUE TRANSACTION REFERENCE"
   - "NOSTRO ACCOUNT" or "VOSTRO ACCOUNT"
   - "REMITTER" and "BENEFICIARY" together
   - "SETTLEMENT AMOUNT" with foreign currency references
   - Bank headers with remittance processing details

2. **THEN CHECK OTHER CATEGORIES:** Only if NOT a FIRA/FIRC document
3. **INVOICE vs FIRA/FIRC:** If document has both invoice elements AND remittance elements, classify as "FIRA/FIRC"
4. Return ONLY the classification category name
5. If uncertain between non-FIRA categories, choose the most specific one
6. If confidence is low or document unclear, return "Not Specified"

**KEY IDENTIFIERS (Priority Order):**
- FIRA/FIRC: **HIGHEST PRIORITY** - Contains "FOREIGN INWARD REMITTANCE", "FIRA", "FIRC", "PAYEE ADVICE", "UTR", "REMITTANCE ADVICE", "INWARD REMITTANCE", "NOSTRO ACCOUNT", "REMITTER", "BENEFICIARY", bank remittance headers, foreign exchange transactions, settlement amounts in multiple currencies
- Logistics Document: Contains transport/shipping references like "AWB", "WAYBILL", "BILL OF LADING", "B/L", "SEA WAYBILL", "CN23", courier companies (DHL, FedEx), shipping lines, vessel names, port references
- Shipping Bill: Contains "SB NO", "SHIPPING BILL", "CSB", export declaration references, customs forms, port codes, IEC numbers
- Invoice: Contains "INVOICE", itemized charges, billing information WITHOUT remittance/banking elements AND WITHOUT transport elements
- Bank Statement: Contains bank letterhead, account transactions, balances

**OUTPUT FORMAT:**
Return ONLY the exact category name from the list above. Do not include any explanations, comments, or additional text.

**DOCUMENT TO CLASSIFY:**
${documentContent}

${images && images.length > 0 ? '**NOTE: Processing PDF via vision (like Claude) - prioritize visual analysis over text content**' : ''}`;

    return this.retryWithBackoff(async () => {
      const messageContent = images && images.length > 0 
        ? [
            { type: 'text', text: classificationPrompt },
            ...images.map(img => ({ 
              type: 'image', 
              source: { 
                type: 'base64', 
                media_type: 'image/png', 
                data: img.split(',')[1] 
              } 
            }))
          ]
        : classificationPrompt;

      const requestPayload = {
        max_tokens: 100,
        messages: [{ role: 'user', content: messageContent }],
        model: images && images.length > 0 ? 'claude-3-7-sonnet-20250219' : 'claude-3-haiku-20240307',
      };

      try {
        this.logApiInteraction('DOCUMENT_CLASSIFICATION_REQUEST', requestPayload);
        
        const message = await anthropic.messages.create(requestPayload);
        
        this.logApiInteraction('DOCUMENT_CLASSIFICATION_RESPONSE', requestPayload, message);

        const classification = (message.content[0] as any)?.text?.trim() || 'Not Specified';
        
        // Estimate confidence based on specificity
        let confidence = 0.5;
        if (classification !== 'Not Specified') {
          confidence = 0.85; // High confidence for successful classification
        }

        console.log(`Classification result: ${classification} (confidence: ${confidence})`);

        return {
          classification,
          confidence
        };
      } catch (error) {
        this.logApiInteraction('DOCUMENT_CLASSIFICATION_ERROR', requestPayload, null, error);
        throw error;
      }
    });
  }

  async extractShippingBillFields(documentContent: string, images?: string[]): Promise<ExtractionResult> {
    const extractionPrompt = `You are an expert trade compliance document processor specializing in shipping bill analysis. Extract the following fields with maximum precision and individual confidence scores from ANY type of shipping bill document:

EXTRACTION TARGETS:
1. SB Number (Shipping Bill Number)
2. SB Date
3. CB Name (Customs Broker Name)
4. Port of Loading
5. HAWB Number
6. IEC Number
7. Port of Final Destination
8. Account Number
9. Invoice Term
10. FOB Value (with currency pairs)
11. Exporter Details
12. Consignee Details
13. Invoice Information (array for multiple invoices)
14. AD Code
15. Buyer Details
16. Financial Details (Freight, Insurance, Discount, Commission)

FIELD IDENTIFICATION RULES:
SB Number:
    Look for: "SB NO", "SB Number", "CSB Number", "SHIPPING BILL"
    Common patterns: Numeric codes, alphanumeric with prefixes (CSB, SB)
    Examples: "2093726", "CSBV_DEL_2024-2025_18_03_21326"
SB Date:
    Look for: "SB Date", "Filling Date", date near SB number
    Common formats: DD-MMM-YY, DD/MM/YYYY, DD-MM-YYYY
CB Name (Customs Broker):
    Look for: "CB NAME", "Courier Name", broker/agent information
    Usually corporate entity names handling customs clearance
Port of Loading:
    Look for: "PORT OF LOADING", port codes, airport codes
    Examples: "DEL", "INAMD4", "INWFD6"
HAWB Number:
    Look for: "HAWB NO", "HAWB Number", "House Airway Bill"
    Numeric codes for air shipments, may be N/A for land/sea
IEC Number:
    Look for: "IEC", "Import Export Code", "IEC/Br"
    Alphanumeric codes for export authorization
Port of Final Destination:
    Look for: "PORT OF FINAL DESTINATION", "COUNTRY OF FINAL DESTINATION"
    Port codes or city names
Account Number:
    Look for: "Account No", "FOREX BANK A/C NO", "DBK BANK A/C NO"
    Bank account numbers for transactions
Invoice Term:
    Look for: "INVOICE TERM", "INVTERM", trade terms
    Common values: FOB, CIF, EXW, etc.
FOB Value:
    Look for: "FOB VALUE", "FOB Value (In INR)", "FOB Value (In Foreign Currency)"
    Extract both value and currency, handle multiple currencies
    Format as currency-value pairs
Exporter Details:
    Look for: "EXPORTER'S NAME & ADDRESS", company details in header
    Extract name and complete address
Consignee Details:
    Look for: "CONSIGNEE", "CONSIGNEE NAME & ADDRESS"
    Extract name and address of goods recipient
Invoice Information (Array):
    Look for: Multiple invoice sections, "INVOICE NO", "INVOICE DETAILS"
    Extract: Invoice Number, Invoice Date, Invoice Value for each invoice
    Handle multiple invoices in array format
AD Code:
    Look for: "AD CODE", "AD Code", authorized dealer code
    Numeric codes for bank authorization
Buyer Details:
    Look for: "BUYER'S NAME & ADDRESS", may reference "SAME AS CONSIGNEE"
    Extract buyer information
Financial Details:
    Look for: "FREIGHT", "INSURANCE", "DISCOUNT", "COMMISSION"
    Extract monetary values, often in valuation sections

CRITICAL INSTRUCTIONS:
    Extract EXACT values as they appear in the document
    Handle multiple invoices as an array
    For FOB values in multiple currencies, create currency-value pairs
    If field not found, return "Not Found"
    Do not infer or guess values
    Maintain original formatting for codes and addresses
    COMPLETE DATA MANDATE: Extract ALL individual records without truncation
    NEVER summarize, abbreviate, or use "..." for repetitive data
    RETURN EVERY SINGLE RECORD: All invoices, all transactions, all entries must be complete

OUTPUT FORMAT:
{
    "sb_number": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "sb_date": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "cb_name": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "port_of_loading": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "hawb_number": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "iec_number": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "port_of_final_destination": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "account_number": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "invoice_term": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "fob_value": [
        {
            "currency": "extracted_currency",
            "value": "extracted_value",
            "confidence": "High/Medium/Low"
        }
    ],
    "exporter_name_address": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "consignee_name_address": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "invoices": [
        {
            "invoice_number": {
                "value": "extracted_value",
                "confidence": "High/Medium/Low"
            },
            "invoice_date": {
                "value": "extracted_value",
                "confidence": "High/Medium/Low"
            },
            "invoice_value": {
                "value": "extracted_value",
                "confidence": "High/Medium/Low"
            }
        }
    ],
    "ad_code": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "buyer_name_address": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "freight": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "insurance": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "discount": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "commission": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    }
}

DOCUMENT TO PROCESS: ${documentContent}`;

    return this.retryWithBackoff(async () => {
      const messageContent = images && images.length > 0 
        ? [
            { type: 'text', text: extractionPrompt },
            ...images.map(img => ({ 
              type: 'image', 
              source: { 
                type: 'base64', 
                media_type: 'image/png', 
                data: img.split(',')[1] 
              } 
            }))
          ]
        : extractionPrompt;

      const requestPayload = {
        max_tokens: 4000,
        messages: [{ 
          role: 'user', 
          content: messageContent 
        }],
        model: 'claude-3-7-sonnet-20250219',
        system: "You are a data extraction API that only returns valid JSON. Never include explanations, comments, or conversational text. Only return the requested JSON structure."
      };

      try {
        this.logApiInteraction('SHIPPING_BILL_EXTRACTION_REQUEST', requestPayload);
        
        const message = await anthropic.messages.create(requestPayload);
        
        this.logApiInteraction('SHIPPING_BILL_EXTRACTION_RESPONSE', requestPayload, message);

        const responseText = (message.content[0] as any)?.text?.trim() || '{}';
        
        console.log('Raw Claude response for shipping bill extraction:');
        console.log(responseText);
        
        try {
          const extractedData = JSON.parse(responseText);
          
          console.log('Parsed extraction data:');
          console.log(JSON.stringify(extractedData, null, 2));
          
          // Calculate overall confidence
          const confidenceScores: number[] = [];
          const processField = (field: any) => {
            if (field && field.confidence) {
              const conf = field.confidence === 'High' ? 0.95 : 
                           field.confidence === 'Medium' ? 0.75 : 0.5;
              confidenceScores.push(conf);
            }
          };

          Object.values(extractedData).forEach((field: any) => {
            if (Array.isArray(field)) {
              field.forEach(item => {
                Object.values(item).forEach(processField);
              });
            } else {
              processField(field);
            }
          });

          const avgConfidence = confidenceScores.length > 0 
            ? confidenceScores.reduce((a, b) => a + b) / confidenceScores.length 
            : 0.5;

          console.log(`Calculated average confidence: ${avgConfidence}`);

          return {
            extractedData,
            confidence: avgConfidence
          };
        } catch (parseError) {
          console.error('JSON parsing failed for shipping bill extraction:');
          console.error('Raw response:', responseText);
          console.error('Parse error:', parseError);
          throw new Error(`Failed to parse extraction result: ${parseError}`);
        }
      } catch (error) {
        this.logApiInteraction('SHIPPING_BILL_EXTRACTION_ERROR', requestPayload, null, error);
        throw error;
      }
    });
  }

  async extractInvoiceFields(documentContent: string, images?: string[]): Promise<ExtractionResult> {
    const extractionPrompt = `You are an expert trade compliance document processor specializing in invoice analysis. Extract the following fields with maximum precision and individual confidence scores from ANY type of invoice document:

EXTRACTION TARGETS:
1. Invoice Number
2. Invoice Date

FIELD IDENTIFICATION RULES:
Invoice Number:
    Primary identifiers: "INVOICE NO", "Invoice No", "Invoice #", "Invoice Number", "INV NO", "INVOICE NUMBER"
    Variations: May include prefixes, suffixes, or separators (e.g., "INVOICE NO - 4042", "Invoice # AFE|EXP|CN-002")
    Common patterns:
        Simple numeric: 1296, 4042, 3950
        Alphanumeric with separators: AFE|EXP|CN-002, INV-2024-001
        Complex codes with multiple segments
    Location: Usually in header section, often near company details or document title
    Priority: Use the main invoice number, not reference numbers or order numbers
Invoice Date:
    Primary identifiers: "DATE", "Invoice Date", "Dated", "Date of Invoice"
    Common formats:
        DD/MM/YYYY (07/11/2024, 16/03/2023)
        DD-MMM-YY (28-Mar-24)
        DD.MM.YYYY, YYYY-MM-DD variations
    Location: Usually near invoice number in header section
    Priority: Use the primary invoice date, not due dates or other reference dates

CRITICAL INSTRUCTIONS:
    Extract EXACT values as they appear in the document
    Maintain original formatting for both number and date
    Do not modify spacing, case, or special characters
    If multiple invoice numbers exist, use the primary/most prominent one
    If field not found, return "Not Found"
    Do not infer or guess values
    Distinguish invoice numbers from order numbers, reference numbers, or customer IDs

COMMON INVOICE TYPES HANDLED:
Tax Invoice, Commercial Invoice, Export Invoice, Proforma Invoice, Credit Note, Debit Note

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format. Do not include any explanations or additional text:

{
    "invoice_number": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "invoice_date": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    }
}

DOCUMENT TO PROCESS: ${documentContent}`;

    return this.retryWithBackoff(async () => {
      const messageContent = images && images.length > 0 
        ? [
            { type: 'text', text: extractionPrompt },
            ...images.map(img => ({ 
              type: 'image', 
              source: { 
                type: 'base64', 
                media_type: 'image/png', 
                data: img.split(',')[1] 
              } 
            }))
          ]
        : extractionPrompt;

      const requestPayload = {
        max_tokens: 1000,
        messages: [{ role: 'user', content: messageContent }],
        model: 'claude-3-7-sonnet-20250219',
        system: "You are a data extraction API that only returns valid JSON. Never include explanations, comments, or conversational text. Only return the requested JSON structure."
      };

      try {
        this.logApiInteraction('INVOICE_EXTRACTION_REQUEST', requestPayload);
        
        const message = await anthropic.messages.create(requestPayload);
        
        this.logApiInteraction('INVOICE_EXTRACTION_RESPONSE', requestPayload, message);

        const responseText = (message.content[0] as any)?.text?.trim() || '{}';
        
        console.log('Raw Claude response for invoice extraction:');
        console.log(responseText);
        
        try {
          const extractedData = JSON.parse(responseText);
          
          console.log('Parsed invoice data:');
          console.log(JSON.stringify(extractedData, null, 2));
          
          // Calculate confidence
          const invoiceNumConf = extractedData.invoice_number?.confidence === 'High' ? 0.95 : 
                                extractedData.invoice_number?.confidence === 'Medium' ? 0.75 : 0.5;
          const invoiceDateConf = extractedData.invoice_date?.confidence === 'High' ? 0.95 : 
                                 extractedData.invoice_date?.confidence === 'Medium' ? 0.75 : 0.5;
          
          const avgConfidence = (invoiceNumConf + invoiceDateConf) / 2;

          console.log(`Calculated average confidence: ${avgConfidence}`);

          return {
            extractedData,
            confidence: avgConfidence
          };
        } catch (parseError) {
          console.error('JSON parsing failed for invoice extraction:');
          console.error('Raw response:', responseText);
          console.error('Parse error:', parseError);
          throw new Error(`Failed to parse extraction result: ${parseError}`);
        }
      } catch (error) {
        this.logApiInteraction('INVOICE_EXTRACTION_ERROR', requestPayload, null, error);
        throw error;
      }
    });
  }

  async extractLogisticsFields(documentContent: string, images?: string[]): Promise<ExtractionResult> {
    const extractionPrompt = `You are an expert trade compliance document processor specializing in logistics document analysis. Extract the following fields with maximum precision and individual confidence scores from ANY type of logistics document:

EXTRACTION TARGETS:
1. Bill of Lading Number / Airway Bill Number (Primary Transport ID)
2. Shipping Bill Number
3. Invoice Number
4. Document Date

FIELD IDENTIFICATION RULES:

**Bill of Lading Number / Airway Bill Number (Primary Transport ID):**
- **For Ocean Transport:** Look for "B/L NO", "BILL OF LADING", "SEA WAYBILL NO", "BL NUMBER"
- **For Air Transport:** Look for "AWB", "WAYBILL", "Air Waybill Number", tracking numbers
- **For Postal:** Look for "CN23", "CN22", customs declaration numbers
- **Common patterns:** Alphanumeric codes (8-15 characters), often with carrier prefixes
- **Priority:** Use the primary transport identifier regardless of transport mode
- **Location:** Usually prominent in header, reference sections, or repeated throughout document

**Shipping Bill Number:**
- Look for: "SB NO", "SB NUMBER", "SHIPPING BILL", export declaration references
- Common patterns: Numeric codes, often with "DTD" (dated) references
- Format examples: "SB NO: XXXXXXX DTD: DD.MM.YYYY", "SB NO: XXXXXXX DT: DD.MM.YYYY"

**Invoice Number:**
- Look for: "Invoice No", "INVOICE NO", "INV NO", "Ref: Invoice", "Invoice Number"
- Common patterns: Alphanumeric codes with possible prefixes/suffixes
- Often appears in reference sections or billing details

**Document Date:**
- **Priority order:**
  1. Operational dates: "SHIPPED ON BOARD DATE", "DATE LADEN ON BOARD", "Shipment Date"
  2. Issue dates: "Date of Issue", "Date", document creation date
- Format: Various date formats (DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY, etc.)
- Usually in header, reference sections, or signature areas

**CRITICAL INSTRUCTIONS:**
- Extract EXACT values as they appear in the document
- Do not modify formatting, spacing, or case
- If multiple instances of same field exist, use the primary/most prominent one
- If field not found, return "Not Found"
- Do not infer, guess, or derive values
- Prioritize complete, clear values over partial matches

**TRANSPORT MODE ADAPTATION:**
- Automatically detect transport type and apply appropriate field mapping
- Ocean/Sea: Use B/L numbers, shipping dates
- Air: Use AWB numbers, shipment dates
- Postal: Use CN23/CN22 numbers, posting dates
- Multi-modal: Use primary transport identifier

OUTPUT FORMAT:
{
    "primary_transport_id": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "shipping_bill_number": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "invoice_number": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "document_date": {
        "value": "extracted_value_or_Not_Found",
        "confidence": "High/Medium/Low"
    },
    "transport_type_detected": "Ocean/Air/Postal/Multi-modal"
}

DOCUMENT TO PROCESS: ${documentContent}`;

    return this.retryWithBackoff(async () => {
      const messageContent = images && images.length > 0 
        ? [
            { type: 'text', text: extractionPrompt },
            ...images.map(img => ({ 
              type: 'image', 
              source: { 
                type: 'base64', 
                media_type: 'image/png', 
                data: img.split(',')[1] 
              } 
            }))
          ]
        : extractionPrompt;

      const requestPayload = {
        max_tokens: 1500,
        messages: [{ role: 'user', content: messageContent }],
        model: 'claude-3-7-sonnet-20250219',
        system: "You are a data extraction API that only returns valid JSON. Never include explanations, comments, or conversational text. Only return the requested JSON structure."
      };

      try {
        this.logApiInteraction('LOGISTICS_EXTRACTION_REQUEST', requestPayload);
        
        const message = await anthropic.messages.create(requestPayload);
        
        this.logApiInteraction('LOGISTICS_EXTRACTION_RESPONSE', requestPayload, message);

        const responseText = (message.content[0] as any)?.text?.trim() || '{}';
        
        console.log('Raw Claude response for logistics extraction:');
        console.log(responseText);
        
        try {
          const extractedData = JSON.parse(responseText);
          
          console.log('Parsed logistics data:');
          console.log(JSON.stringify(extractedData, null, 2));
          
          // Calculate confidence
          const confidenceScores: number[] = [];
          ['primary_transport_id', 'shipping_bill_number', 'invoice_number', 'document_date'].forEach(field => {
            if (extractedData[field]?.confidence) {
              const conf = extractedData[field].confidence === 'High' ? 0.95 : 
                          extractedData[field].confidence === 'Medium' ? 0.75 : 0.5;
              confidenceScores.push(conf);
            }
          });

          const avgConfidence = confidenceScores.length > 0 
            ? confidenceScores.reduce((a, b) => a + b) / confidenceScores.length 
            : 0.5;

          console.log(`Calculated average confidence: ${avgConfidence}`);

          return {
            extractedData,
            confidence: avgConfidence
          };
        } catch (parseError) {
          console.error('JSON parsing failed for logistics extraction:');
          console.error('Raw response:', responseText);
          console.error('Parse error:', parseError);
          throw new Error(`Failed to parse extraction result: ${parseError}`);
        }
      } catch (error) {
        this.logApiInteraction('LOGISTICS_EXTRACTION_ERROR', requestPayload, null, error);
        throw error;
      }
    });
  }

  async extractFiraFircFields(documentContent: string, images?: string[]): Promise<ExtractionResult> {
    // Using a simplified FIRA/FIRC extraction prompt based on the schema
    const extractionPrompt = `You are an expert trade compliance document processor specializing in FIRA/FIRC analysis. Extract the following fields from the FIRA/FIRC document:

EXTRACTION TARGETS:
1. Provider
2. UTR Number
3. Date
4. Total Settlement Amount (INR)
5. Account Number
6. Remitter
7. Receiver
8. Purpose Code
9. Transaction Breakup (array of transactions)

OUTPUT FORMAT (JSON):
{
    "provider": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "utr_number": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "date": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "total_settlement_amount_inr": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "account_number": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "remitter": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "receiver": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "purpose_code": {"value": "extracted_value_or_Not_Found", "confidence": "High/Medium/Low"},
    "transaction_breakup": [
        {
            "reference_no": {"value": "extracted_value", "confidence": "High/Medium/Low"},
            "buyer_name": {"value": "extracted_value", "confidence": "High/Medium/Low"},
            "buyer_address": {"value": "extracted_value", "confidence": "High/Medium/Low"},
            "buyer_country": {"value": "extracted_value", "confidence": "High/Medium/Low"},
            "date": {"value": "extracted_value", "confidence": "High/Medium/Low"},
            "amount_inr": {"value": "extracted_value", "confidence": "High/Medium/Low"},
            "amount_foreign_currency": {"value": "extracted_value", "confidence": "High/Medium/Low"},
            "currency": {"value": "extracted_value", "confidence": "High/Medium/Low"}
        }
    ]
}

DOCUMENT TO PROCESS: ${documentContent}`;

    return this.retryWithBackoff(async () => {
      const messageContent = images && images.length > 0 
        ? [
            { type: 'text', text: extractionPrompt },
            ...images.map(img => ({ 
              type: 'image', 
              source: { 
                type: 'base64', 
                media_type: 'image/png', 
                data: img.split(',')[1] 
              } 
            }))
          ]
        : extractionPrompt;

      const requestPayload = {
        max_tokens: 3000,
        messages: [{ role: 'user', content: messageContent }],
        model: 'claude-3-7-sonnet-20250219',
        system: "You are a data extraction API that only returns valid JSON. Never include explanations, comments, or conversational text. Only return the requested JSON structure."
      };

      try {
        this.logApiInteraction('FIRA_FIRC_EXTRACTION_REQUEST', requestPayload);
        
        const message = await anthropic.messages.create(requestPayload);
        
        this.logApiInteraction('FIRA_FIRC_EXTRACTION_RESPONSE', requestPayload, message);

        const responseText = (message.content[0] as any)?.text?.trim() || '{}';
        
        console.log('Raw Claude response for FIRA/FIRC extraction:');
        console.log(responseText);
        
        try {
          const extractedData = JSON.parse(responseText);
          
          console.log('Parsed FIRA/FIRC data:');
          console.log(JSON.stringify(extractedData, null, 2));
          
          // Calculate confidence (simplified)
          const avgConfidence = 0.8; // Default confidence for FIRA/FIRC

          console.log(`Calculated average confidence: ${avgConfidence}`);

          return {
            extractedData,
            confidence: avgConfidence
          };
        } catch (parseError) {
          console.error('JSON parsing failed for FIRA/FIRC extraction:');
          console.error('Raw response:', responseText);
          console.error('Parse error:', parseError);
          throw new Error(`Failed to parse extraction result: ${parseError}`);
        }
      } catch (error) {
        this.logApiInteraction('FIRA_FIRC_EXTRACTION_ERROR', requestPayload, null, error);
        throw error;
      }
    });
  }
}

export const claudeService = new ClaudeService();
