import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { ReceiptFile } from '../models/ReceiptFile';
import { AppError } from '../types/errors';

export class FileService {
  private receiptFileRepository = AppDataSource.getRepository(ReceiptFile);
  private uploadDir: string;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['application/pdf'];

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFileMetadata(fileName: string, filePath: string): Promise<ReceiptFile> {
    try {
      const receiptFile = new ReceiptFile();
      receiptFile.file_name = fileName;
      receiptFile.file_path = filePath;
      receiptFile.is_valid = false;
      receiptFile.is_processed = false;

      return await this.receiptFileRepository.save(receiptFile);
    } catch (error) {
      throw AppError.databaseError('Failed to save file metadata');
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    try {
      // Validate file type
      if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw AppError.validationError('Only PDF files are allowed');
      }

      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw AppError.validationError('File size exceeds 10MB limit');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}-${originalName}`;
      const filePath = path.join(this.uploadDir, filename);

      // Move file to upload directory
      await fs.promises.rename(file.path, filePath);

      // Return relative path
      return path.relative(process.cwd(), filePath);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.fileError('Failed to save file');
    }
  }

  async validatePdf(filePath: string): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        return { isValid: false, reason: 'File not found' };
      }

      // Check file size
      const stats = await fs.promises.stat(fullPath);
      if (stats.size === 0) {
        return { isValid: false, reason: 'File is empty' };
      }
      if (stats.size > this.MAX_FILE_SIZE) {
        return { isValid: false, reason: 'File size exceeds 10MB limit' };
      }

      // Enhanced PDF validation
      const buffer = Buffer.alloc(1024); // Read more bytes for better validation
      const fd = await fs.promises.open(fullPath, 'r');
      await fd.read(buffer, 0, 1024, 0);
      await fd.close();

      // Check for PDF signature (%PDF-)
      const isPdf = buffer.toString().startsWith('%PDF-');
      if (!isPdf) {
        return { isValid: false, reason: 'Invalid PDF format: Missing PDF signature' };
      }

      // Check for PDF version
      const versionMatch = buffer.toString().match(/%PDF-(\d+\.\d+)/);
      if (!versionMatch) {
        return { isValid: false, reason: 'Invalid PDF format: Missing version number' };
      }

      // Check for EOF marker
      const hasEof = buffer.toString().includes('%%EOF');
      if (!hasEof) {
        // This is not a definitive check as EOF might be at the end of the file
        // We'll just log it for now
        console.warn('PDF EOF marker not found in header');
      }

      return { isValid: true };
    } catch (error) {
      console.error('PDF validation error:', error);
      return { isValid: false, reason: 'Failed to validate PDF: ' + (error as Error).message };
    }
  }

  async updateFileValidation(fileId: number, isValid: boolean, reason?: string): Promise<void> {
    try {
      await this.receiptFileRepository.update(fileId, {
        is_valid: isValid,
        invalid_reason: reason
      });
    } catch (error) {
      throw AppError.databaseError('Failed to update file validation status');
    }
  }

  async updateFileProcessing(fileId: number, isProcessed: boolean, statusMessage?: string): Promise<void> {
    try {
      const receiptFile = await this.receiptFileRepository.findOne({
        where: { id: fileId }
      });

      if (!receiptFile) {
        throw AppError.notFoundError('File not found');
      }

      receiptFile.is_processed = isProcessed;
      if (statusMessage) {
        receiptFile.invalid_reason = statusMessage;
      }

      await this.receiptFileRepository.save(receiptFile);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.databaseError('Failed to update file processing status');
    }
  }

  async getFileById(id: number): Promise<ReceiptFile | null> {
    try {
      return await this.receiptFileRepository.findOneBy({ id });
    } catch (error) {
      throw AppError.databaseError('Failed to retrieve file');
    }
  }

  async getAllFiles(): Promise<ReceiptFile[]> {
    try {
      return await this.receiptFileRepository.find();
    } catch (error) {
      throw AppError.databaseError('Failed to retrieve files');
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (error) {
      throw AppError.fileError('Failed to delete file');
    }
  }

  async deleteFileRecord(id: number): Promise<void> {
    try {
      const result = await this.receiptFileRepository.delete(id);
      if (result.affected === 0) {
        throw AppError.notFoundError(`File with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.databaseError('Failed to delete file record');
    }
  }
} 