import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import { fromBuffer } from 'pdf2pic';

// Simple file storage service (in production, use cloud storage like S3)
export class FileUploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  getMulterConfig() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        await this.ensureUploadDir();
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    });

    const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      }
    });
  }

  async readFileContent(filepath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filepath);

      // Check if it's a PDF file
      if (path.extname(filepath).toLowerCase() === '.pdf') {
        try {
          const data = await pdf(buffer);

          console.log(`PDF parsing successful for ${path.basename(filepath)}`);
          console.log(`Extracted ${data.text.length} characters of text`);
          console.log(`Text preview: ${data.text.substring(0, 500)}...`);

          if (!data.text || data.text.trim().length === 0) {
            throw new Error('PDF contains no extractable text');
          }

          return data.text;
        } catch (pdfError) {
          console.error(`PDF parsing failed for ${path.basename(filepath)}:`, pdfError);
          throw new Error(`Failed to parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF parsing error'}`);
        }
      } else {
        // For non-PDF files, return buffer as text
        return buffer.toString('utf-8');
      }
    } catch (error) {
      console.error(`Failed to parse PDF ${filepath}:`, error);
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : error}`);
    }
  }

  async deleteFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  getFileUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async convertPdfToImages(filepath: string): Promise<string[]> {
    try {
      const tempDir = path.join(this.uploadDir, 'temp');

      // Ensure temp directory exists
      try {
        await fs.access(tempDir);
      } catch {
        await fs.mkdir(tempDir, { recursive: true });
      }

      const buffer = await fs.readFile(filepath);

      const convert = fromBuffer(buffer, {
        density: 300, // Higher density for better vision processing (like Claude)
        saveFilename: "page",
        savePath: tempDir,
        format: "png",
        width: 2048, // Higher resolution for better OCR and vision analysis
        height: 2048
      });

      const results = await convert.bulk(-1, { responseType: "buffer" });

      // Convert images to base64
      const base64Images: string[] = [];
      for (const result of results) {
        if (result.buffer) {
          const base64 = result.buffer.toString('base64');
          base64Images.push(`data:image/png;base64,${base64}`);
        } else if (result.path) {
          const imageBuffer = await fs.readFile(result.path);
          const base64 = imageBuffer.toString('base64');
          base64Images.push(`data:image/png;base64,${base64}`);

          // Clean up temp file
          await fs.unlink(result.path).catch(() => {});
        }
      }

      console.log(`Successfully converted PDF to ${base64Images.length} images`);
      return base64Images;
    } catch (error) {
      console.error('PDF to image conversion failed:', error);
      throw new Error(`Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const fileUploadService = new FileUploadService();