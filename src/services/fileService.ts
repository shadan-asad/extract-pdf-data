import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { ReceiptFile } from '../models/ReceiptFile';
import { createWorker } from 'tesseract.js';
import pdf from 'pdf-parse';
import { AppError } from '../types/errors';

export class FileService {
  private receiptFileRepository = AppDataSource.getRepository(ReceiptFile);

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

  async validatePdf(filePath: string): Promise<{ isValid: boolean; reason?: string }> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        return {
          isValid: false,
          reason: 'File not found on disk'
        };
      }

      const dataBuffer = fs.readFileSync(fullPath);
      await pdf(dataBuffer);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        reason: error instanceof Error ? error.message : 'Invalid PDF file'
      };
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

  async deleteFile(id: number): Promise<void> {
    try {
      const file = await this.getFileById(id);
      if (!file) {
        throw AppError.notFound(`File with ID ${id} not found`);
      }

      // Delete physical file
      const filePath = path.join(process.cwd(), file.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete database record
      await this.deleteFileRecord(id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.databaseError('Failed to delete file');
    }
  }

  async deleteFileRecord(id: number): Promise<void> {
    try {
      const result = await this.receiptFileRepository.delete(id);
      if (result.affected === 0) {
        throw AppError.notFound(`File with ID ${id} not found`);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.databaseError('Failed to delete file record');
    }
  }
} 