import { db } from "./db";
import { 
  documents, 
  shippingBillData, 
  invoiceData, 
  logisticsData, 
  firaFircData, 
  documentFlags, 
  manualCorrections 
} from "@shared/schema";

export async function clearDocumentData() {
  console.log('🧹 Starting database cleanup - removing all document data...');

  try {
    // Delete in reverse dependency order to avoid foreign key constraints

    // 1. Delete manual corrections
    const deletedCorrections = await db.delete(manualCorrections);
    console.log('✅ Deleted manual corrections');

    // 2. Delete document flags
    const deletedFlags = await db.delete(documentFlags);
    console.log('✅ Deleted document flags');

    // 3. Delete extracted data tables
    const deletedShippingBills = await db.delete(shippingBillData);
    console.log('✅ Deleted shipping bill data');

    const deletedInvoices = await db.delete(invoiceData);
    console.log('✅ Deleted invoice data');

    const deletedLogistics = await db.delete(logisticsData);
    console.log('✅ Deleted logistics data');

    const deletedFiraFirc = await db.delete(firaFircData);
    console.log('✅ Deleted FIRA/FIRC data');

    // 4. Delete documents (parent table)
    const deletedDocuments = await db.delete(documents);
    console.log('✅ Deleted all documents');

    console.log('🎉 Database cleanup completed successfully!');
    console.log('📋 Summary:');
    console.log('   - All documents removed');
    console.log('   - All extracted data cleared');
    console.log('   - All flags and corrections removed');
    console.log('   - Customers retained');
    console.log('   - Core functionality preserved');

    return {
      success: true,
      message: 'All document data successfully cleared'
    };

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    return {
      success: false,
      message: `Cleanup failed: ${error}`,
      error
    };
  }
}

// Run cleanup if this file is executed directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  clearDocumentData()
    .then(result => {
      if (result.success) {
        console.log('✨ Cleanup completed successfully');
        process.exit(0);
      } else {
        console.error('💥 Cleanup failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}