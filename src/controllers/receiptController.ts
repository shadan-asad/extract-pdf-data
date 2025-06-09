import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/fileService';
import { ReceiptExtractionService } from '../services/receiptExtractionService';
import { AppError, ErrorType } from '../types/errors';
import { Receipt } from '../models/Receipt';
import { AppDataSource } from '../config/database';

export class ReceiptController {
  private fileService: FileService;
  private extractionService: ReceiptExtractionService;
  private receiptRepository = AppDataSource.getRepository(Receipt);

  constructor() {
    this.fileService = new FileService();
    this.extractionService = new ReceiptExtractionService();
  }

  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw AppError.validationError('No file uploaded');
      }

      // Save file to disk and get metadata
      const filePath = await this.fileService.saveFile(req.file);
      const receiptFile = await this.fileService.saveFileMetadata(req.file.originalname, filePath);

      res.status(201).json({
        success: true,
        data: {
          file: {
            id: receiptFile.id,
            file_name: receiptFile.file_name,
            file_path: receiptFile.file_path,
            is_valid: receiptFile.is_valid,
            is_processed: receiptFile.is_processed,
            created_at: receiptFile.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async validateReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileId = parseInt(req.params.fileId);
      if (isNaN(fileId)) {
        throw AppError.validationError('Invalid file ID');
      }

      const receiptFile = await this.fileService.getFileById(fileId);
      if (!receiptFile) {
        throw AppError.notFoundError('File not found');
      }

      // Extract and validate data
      const extractedData = await this.extractionService.extractReceiptData(receiptFile.file_path);
      
      // Update file validation status
      await this.fileService.updateFileValidation(fileId, true);

      res.json({
        success: true,
        data: {
          file: {
            id: receiptFile.id,
            file_name: receiptFile.file_name,
            is_valid: true,
            is_processed: false,
            extracted_data: {
              merchant_name: extractedData.merchantName,
              purchased_at: extractedData.purchaseDate,
              total_amount: extractedData.totalAmount
            }
          }
        }
      });
    } catch (error) {
      if (error instanceof AppError && error.type === ErrorType.VALIDATION) {
        // Update file validation status with error
        await this.fileService.updateFileValidation(parseInt(req.params.fileId), false, error.message);
      }
      next(error);
    }
  }

  async processReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fileId = parseInt(req.params.fileId);
      if (isNaN(fileId)) {
        throw AppError.validationError('Invalid file ID');
      }

      const receiptFile = await this.fileService.getFileById(fileId);
      if (!receiptFile) {
        throw AppError.notFoundError('File not found');
      }

      if (!receiptFile.is_valid) {
        throw AppError.validationError('Cannot process invalid receipt');
      }

      // Extract data and save to database
      const extractedData = await this.extractionService.extractReceiptData(receiptFile.file_path);
      const receipt = await this.extractionService.saveReceiptData(receiptFile.file_path, extractedData);

      // Update file processing status
      await this.fileService.updateFileProcessing(fileId, true);

      res.json({
        success: true,
        data: {
          receipt: {
            id: receipt.id,
            merchant_name: receipt.merchant_name,
            purchased_at: receipt.purchased_at,
            total_amount: receipt.total_amount,
            file_path: receipt.file_path,
            created_at: receipt.created_at
          },
          extracted_items: extractedData.items
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receiptId = parseInt(req.params.id);
      if (isNaN(receiptId)) {
        throw AppError.validationError('Invalid receipt ID');
      }

      const receipt = await this.receiptRepository.findOne({
        where: { id: receiptId }
      });

      if (!receipt) {
        throw AppError.notFoundError('Receipt not found');
      }

      res.json({
        success: true,
        data: {
          receipt: {
            id: receipt.id,
            merchant_name: receipt.merchant_name,
            purchased_at: receipt.purchased_at,
            total_amount: receipt.total_amount,
            file_path: receipt.file_path,
            created_at: receipt.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async listReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [receipts, total] = await this.receiptRepository.findAndCount({
        skip,
        take: limit,
        order: {
          purchased_at: 'DESC'
        }
      });

      res.json({
        success: true,
        data: {
          receipts: receipts.map(receipt => ({
            id: receipt.id,
            merchant_name: receipt.merchant_name,
            purchased_at: receipt.purchased_at,
            total_amount: receipt.total_amount,
            file_path: receipt.file_path,
            created_at: receipt.created_at
          })),
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receiptId = parseInt(req.params.id);
      if (isNaN(receiptId)) {
        throw AppError.validationError('Invalid receipt ID');
      }

      const receipt = await this.receiptRepository.findOne({
        where: { id: receiptId }
      });

      if (!receipt) {
        throw AppError.notFoundError('Receipt not found');
      }

      // Delete file from disk
      await this.fileService.deleteFile(receipt.file_path);

      // Delete from database
      await this.receiptRepository.remove(receipt);

      res.json({
        success: true,
        message: 'Receipt deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async terminate(): Promise<void> {
    await this.extractionService.terminate();
  }
}