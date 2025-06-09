import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { ReceiptFile } from '../models/ReceiptFile';
import { AppError } from '../types/errors';

export class FileService {
  private receiptFileRepository = AppDataSource.getRepository(ReceiptFile);
  private uploadDir: string;

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
      throw AppError.fileError('Failed to save file');
    }
  }

  async validatePdf(filePath: string): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        return { isValid: false, reason: 'File not found' };
      }

      // Basic PDF validation - check file signature
      const buffer = Buffer.alloc(5);
      const fd = await fs.promises.open(fullPath, 'r');
      await fd.read(buffer, 0, 5, 0);
      await fd.close();

      // Check for PDF signature (%PDF-)
      const isPdf = buffer.toString().startsWith('%PDF-');
      return {
        isValid: isPdf,
        reason: isPdf ? undefined : 'Invalid PDF format'
      };
    } catch (error) {
      return { isValid: false, reason: 'Failed to validate PDF' };
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