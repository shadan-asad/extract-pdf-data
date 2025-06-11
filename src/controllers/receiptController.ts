import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/fileService';
import { ReceiptExtractionService } from '../services/receiptExtractionService';
import { AppError, ErrorType } from '../types/errors';
import { Receipt } from '../models/Receipt';
import { AppDataSource } from '../config/database';

const PROCESS_TIMEOUT = 180000; // 180 seconds timeout for entire process

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
        },
        message: 'File uploaded successfully'
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

      // Validate PDF format
      const validationResult = await this.fileService.validatePdf(receiptFile.file_path);
      
      // Update file validation status
      await this.fileService.updateFileValidation(
        fileId, 
        validationResult.isValid, 
        validationResult.reason
      );

      res.json({
        success: true,
        data: {
          file: {
            id: receiptFile.id,
            file_name: receiptFile.file_name,
            is_valid: validationResult.isValid,
            is_processed: false,
            invalid_reason: validationResult.reason
          }
        },
        message: validationResult.isValid ? 
          'File validated successfully' : 
          'File validation failed'
      });
    } catch (error) {
      next(error);
    }
  }

  async processReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    let receiptFile = null;

    try {
      const fileId = parseInt(req.params.fileId);
      if (isNaN(fileId)) {
        throw AppError.validationError('Invalid file ID');
      }

      // Check if we've exceeded the total process timeout
      if (Date.now() - startTime > PROCESS_TIMEOUT) {
        throw AppError.processingError('Process timeout exceeded');
      }

      receiptFile = await this.fileService.getFileById(fileId);
      if (!receiptFile) {
        throw AppError.notFoundError('File not found');
      }

      if (!receiptFile.is_valid) {
        throw AppError.validationError(
          'Cannot process invalid receipt: ' + 
          (receiptFile.invalid_reason || 'File not validated')
        );
      }

      // Set processing status to in-progress
      await this.fileService.updateFileProcessing(fileId, false, 'Processing in progress');

      // Extract data using OCR/AI with timeout
      const extractionPromise = this.extractionService.extractReceiptData(receiptFile.file_path);
      const extractedData = await Promise.race([
        extractionPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Data extraction timeout')), PROCESS_TIMEOUT)
        )
      ]);
      
      // Save to database
      const receipt = await this.extractionService.saveReceiptData(receiptFile.file_path, extractedData);

      // Update file processing status to success
      await this.fileService.updateFileProcessing(fileId, true, 'Processing completed successfully');

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
        },
        message: 'Receipt processed successfully'
      });
    } catch (error) {
      // If processing fails, update the file status
      if (receiptFile) {
        try {
          const errorMessage = error instanceof AppError ? 
            error.message : 
            'Processing failed: ' + (error as Error).message;
          
          await this.fileService.updateFileProcessing(
            receiptFile.id, 
            false,
            errorMessage
          );
        } catch (updateError) {
          console.error('Failed to update file processing status:', updateError);
        }
      }

      // Clean up OCR resources
      try {
        await this.extractionService.terminate();
      } catch (cleanupError) {
        console.error('Failed to cleanup OCR resources:', cleanupError);
      }

      next(error);
    }
  }

  async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receiptId = req.params.id;
      if (!receiptId) {
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

      // Add sorting options
      const sortBy = (req.query.sortBy as string) || 'purchased_at';
      const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Validate sort field
      const allowedSortFields = ['purchased_at', 'merchant_name', 'total_amount', 'created_at'];
      if (!allowedSortFields.includes(sortBy)) {
        throw AppError.validationError('Invalid sort field');
      }

      const [receipts, total] = await this.receiptRepository.findAndCount({
        skip,
        take: limit,
        order: {
          [sortBy]: sortOrder
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
            pages: Math.ceil(total / limit),
            has_more: skip + receipts.length < total
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receiptId = req.params.id;
      if (!receiptId) {
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