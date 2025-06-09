import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/fileService';
import { ReceiptExtractionService } from '../services/receiptExtractionService';
import { AppError } from '../types/errors';
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

  async uploadReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw AppError.validationError('No file uploaded');
      }

      // Save file to disk
      const filePath = await this.fileService.saveFile(req.file);

      // Extract data from receipt
      const extractedData = await this.extractionService.extractReceiptData(filePath);

      // Save receipt data to database
      const receipt = await this.extractionService.saveReceiptData(filePath, extractedData);

      res.status(201).json({
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