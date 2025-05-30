
import { clearDocumentData } from './server/cleanup-documents';
import { clearUploadedFiles } from './server/cleanup-uploads';

async function performCompleteCleanup() {
  console.log('🚀 Starting complete system cleanup...');
  console.log('');
  
  // Step 1: Clear database document data
  console.log('STEP 1: Database Cleanup');
  console.log('========================');
  const dbResult = await clearDocumentData();
  
  if (!dbResult.success) {
    console.error('Database cleanup failed, aborting...');
    return;
  }
  
  console.log('');
  
  // Step 2: Clear uploaded files
  console.log('STEP 2: File System Cleanup');
  console.log('===========================');
  const fileResult = await clearUploadedFiles();
  
  console.log('');
  console.log('🎯 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`Database: ${dbResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Files: ${fileResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log('');
  
  if (dbResult.success && fileResult.success) {
    console.log('🎉 COMPLETE CLEANUP SUCCESSFUL!');
    console.log('');
    console.log('Your system is now ready for fresh testing:');
    console.log('• All documents removed from database');
    console.log('• All uploaded files deleted');
    console.log('• All extracted data cleared');
    console.log('• Customer accounts preserved');
    console.log('• System functionality intact');
    console.log('');
    console.log('You can now upload new documents to test the system!');
  } else {
    console.log('❌ Some cleanup operations failed. Check the logs above.');
  }
}

// Execute the cleanup
performCompleteCleanup().catch(console.error);
