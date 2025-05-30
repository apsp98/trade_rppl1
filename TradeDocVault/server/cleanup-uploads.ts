
import fs from 'fs';
import path from 'path';

export async function clearUploadedFiles() {
  console.log('🗂️ Starting uploaded files cleanup...');
  
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  try {
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 No uploads directory found - nothing to clean');
      return { success: true, message: 'No files to clean' };
    }
    
    // Read all files in uploads directory
    const files = fs.readdirSync(uploadsDir);
    
    if (files.length === 0) {
      console.log('📁 Uploads directory is already empty');
      return { success: true, message: 'No files to clean' };
    }
    
    console.log(`🗑️ Found ${files.length} files to remove`);
    
    // Delete each file
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`   ✅ Deleted: ${file}`);
      } catch (fileError) {
        console.warn(`   ⚠️ Could not delete ${file}:`, fileError);
      }
    }
    
    console.log('🎉 File cleanup completed!');
    return { success: true, message: 'All uploaded files cleared' };
    
  } catch (error) {
    console.error('❌ Error during file cleanup:', error);
    return { success: false, message: `File cleanup failed: ${error}` };
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  clearUploadedFiles()
    .then(result => {
      if (result.success) {
        console.log('✨ File cleanup completed successfully');
        process.exit(0);
      } else {
        console.error('💥 File cleanup failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}
