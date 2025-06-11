import { createWorker, Worker, PSM, RecognizeResult } from 'tesseract.js';
import { PdfImageService } from './pdfImageService';
import { AppError } from '../types/errors';

const OCR_TIMEOUT = 300000; // 5 minutes for OCR
const PROCESS_TIMEOUT = 600000; // 10 minutes for entire process
const PDF_CONVERSION_TIMEOUT = 300000; // 5 minutes for PDF conversion

export class OCRService {
  private worker: Worker | null = null;
  private pdfImageService: PdfImageService;

  constructor() {
    this.pdfImageService = new PdfImageService();
  }

  async initialize(): Promise<void> {
    try {
      // Create worker with English language
      this.worker = await createWorker('eng');

      // Set runtime parameters that can be changed after initialization
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,/-: ',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
        textord_heavy_nr: '1',
        textord_min_linesize: '2.5'
      });

      console.log('OCR worker initialized successfully');
    } catch (error) {
      console.error('OCR initialization error:', error);
      throw AppError.processingError('Failed to initialize OCR service: ' + (error as Error).message);
    }
  }

  async extractTextFromPdf(pdfPath: string): Promise<string> {
    const startTime = Date.now();
    console.log('Starting PDF text extraction...');
    let tempImages: string[] = [];

    try {
      // Check if we've exceeded the total process timeout
      if (Date.now() - startTime > PROCESS_TIMEOUT) {
        throw AppError.processingError('Data extraction timeout');
      }

      // Convert PDF to images with timeout
      console.log('Converting PDF to images...');
      const conversionPromise = this.pdfImageService.convertPdfToImages(pdfPath);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('PDF conversion timeout'));
        }, PDF_CONVERSION_TIMEOUT);
      });

      tempImages = await Promise.race([conversionPromise, timeoutPromise]) as string[];
      console.log(`Successfully converted PDF to ${tempImages.length} images`);

      // Process each image with OCR
      const allText: string[] = [];
      for (const imagePath of tempImages) {
        try {
          // Check if we've exceeded the total process timeout
          if (Date.now() - startTime > PROCESS_TIMEOUT) {
            throw AppError.processingError('Data extraction timeout');
          }

          if (!this.worker) {
            console.error('OCR worker not initialized');
            throw AppError.processingError('OCR worker not initialized');
          }

          console.log(`Processing image with OCR: ${imagePath}`);
          const ocrPromise = this.worker.recognize(imagePath);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('OCR recognition timeout'));
            }, OCR_TIMEOUT);
          });

          const result = await Promise.race([ocrPromise, timeoutPromise]) as RecognizeResult;
          console.log(`OCR completed for ${imagePath}`);
          
          if (result.data.text) {
            allText.push(result.data.text);
          }
        } catch (error) {
          console.error(`Error processing image ${imagePath}:`, {
            error,
            message: error.message,
            stack: error.stack
          });
          // Continue with other images even if one fails
        }
      }

      if (allText.length === 0) {
        throw AppError.processingError('No text could be extracted from the PDF');
      }

      return allText.join('\n\n');
    } catch (error) {
      console.error('Error in extractTextFromPdf:', {
        error,
        message: error.message,
        stack: error.stack,
        elapsedTime: Date.now() - startTime
      });

      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.processingError('Failed to extract text from PDF: ' + (error as Error).message);
    } finally {
      // Clean up temporary images
      if (tempImages.length > 0) {
        try {
          console.log('Cleaning up temporary images...');
          await this.pdfImageService.cleanupImages(tempImages);
          console.log('Temporary images cleaned up successfully');
        } catch (cleanupError) {
          console.error('Error cleaning up temporary images:', {
            error: cleanupError,
            message: cleanupError.message,
            stack: cleanupError.stack
          });
        }
      }
    }
  }

  private normalizeText(text: string): string {
    return text
      // Replace special dollar sign characters with standard dollar sign
      .replace(/[＄＄$]/g, '$')
      // Replace special decimal points with standard decimal point
      .replace(/[．．.]/g, '.')
      // Replace special commas with standard comma
      .replace(/[,，]/g, ',')
      // Replace special spaces and newlines
      .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Replace multiple newlines with single newline
      .replace(/\n+/g, '\n')
      // Trim whitespace
      .trim();
  }

  private postProcessText(text: string): string {
    return text
      // Fix common OCR mistakes in amounts
      .replace(/(\d+)[oO](\d{2})/g, '$1.0$2') // Fix 10o00 -> 10.00
      .replace(/(\d+)[lI](\d{2})/g, '$1.1$2') // Fix 10l00 -> 10.10
      // Fix common date format issues
      .replace(/(\d{1,2})[oO](\d{1,2})[oO](\d{2,4})/g, '$1/0$2/0$3') // Fix 1o1o2023 -> 1/01/2023
      // Remove any remaining non-printable characters
      .replace(/[^\x20-\x7E\n]/g, '')
      // Final cleanup
      .trim();
  }

  async terminate(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
      }
    } catch (error) {
      console.error('Error terminating OCR service:', error);
    }
  }
} 