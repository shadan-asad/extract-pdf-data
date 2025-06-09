import { Request, Response, NextFunction } from 'express';
import { FileService } from '../services/fileService';
import { AppError, ErrorType } from '../types/errors';
import path from 'path';
import fs from 'fs';

export class ReceiptController {
  private fileService: FileService;

  constructor() {
    this.fileService = new FileService();
  }

  uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw AppError.validationError('No file uploaded. Please upload a PDF file with field name "receipt"');
      }

      // Validate file exists on disk
      if (!fs.existsSync(req.file.path)) {
        throw AppError.fileError('Uploaded file not found on server');
      }

      const filePath = path.relative(process.cwd(), req.file.path);
      const receiptFile = await this.fileService.saveFileMetadata(req.file.originalname, filePath);

      res.status(201).json({
        status: 'success',
        data: receiptFile
      });
    } catch (error) {
      // If there's an error and we have a file, clean it up
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  };

  validateFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      // Validate ID is a number
      if (isNaN(Number(id))) {
        throw AppError.validationError('Invalid file ID format');
      }

      const file = await this.fileService.getFileById(Number(id));
      if (!file) {
        throw AppError.notFound(`File with ID ${id} not found`);
      }

      // Check if file exists on disk
      const fullPath = path.join(process.cwd(), file.file_path);
      if (!fs.existsSync(fullPath)) {
        throw AppError.fileError(`File not found at path: ${file.file_path}`);
      }

      const validationResult = await this.fileService.validatePdf(file.file_path);
      await this.fileService.updateFileValidation(file.id, validationResult.isValid, validationResult.reason);

      res.status(200).json({
        status: 'success',
        data: {
          isValid: validationResult.isValid,
          reason: validationResult.reason
        }
      });
    } catch (error) {
      next(error);
    }
  };

  getFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ID is a number
      if (isNaN(Number(id))) {
        throw AppError.validationError('Invalid file ID format');
      }

      const file = await this.fileService.getFileById(Number(id));
      if (!file) {
        throw AppError.notFound(`File with ID ${id} not found`);
      }

      // Check if file exists on disk
      const fullPath = path.join(process.cwd(), file.file_path);
      if (!fs.existsSync(fullPath)) {
        throw AppError.fileError(`File not found at path: ${file.file_path}`);
      }

      res.status(200).json({
        status: 'success',
        data: file
      });
    } catch (error) {
      next(error);
    }
  };

  getAllFiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = await this.fileService.getAllFiles();

      // Filter out files that don't exist on disk
      const validFiles = files.filter(file => {
        const fullPath = path.join(process.cwd(), file.file_path);
        return fs.existsSync(fullPath);
      });

      // Update database for files that don't exist
      for (const file of files) {
        const fullPath = path.join(process.cwd(), file.file_path);
        if (!fs.existsSync(fullPath)) {
          await this.fileService.updateFileValidation(
            file.id,
            false,
            'File not found on disk'
          );
        }
      }

      res.status(200).json({
        status: 'success',
        data: validFiles
      });
    } catch (error) {
      next(error);
    }
  };

  deleteFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ID is a number
      if (isNaN(Number(id))) {
        throw AppError.validationError('Invalid file ID format');
      }

      const file = await this.fileService.getFileById(Number(id));
      if (!file) {
        throw AppError.notFound(`File with ID ${id} not found`);
      }

      // Check if file exists on disk before attempting deletion
      const fullPath = path.join(process.cwd(), file.file_path);
      if (fs.existsSync(fullPath)) {
        await this.fileService.deleteFile(Number(id));
      } else {
        // If file doesn't exist on disk, just delete the database record
        await this.fileService.deleteFileRecord(Number(id));
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
} 