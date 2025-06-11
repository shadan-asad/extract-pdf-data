import { OCRService } from './ocrService';
import { AppError } from '../types/errors';
import { Receipt } from '../models/Receipt';
import { AppDataSource } from '../config/database';
import { GeminiService } from './geminiService';
import { ExtractedReceiptData } from '../types/receipt';

export class ReceiptExtractionService {
  private ocrService: OCRService;
  private geminiService: GeminiService;
  private receiptRepository = AppDataSource.getRepository(Receipt);
  private initialized: boolean = false;

  constructor() {
    this.ocrService = new OCRService();
    this.geminiService = new GeminiService();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      try {
        await this.ocrService.initialize();
        this.initialized = true;
        console.log('OCR service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize OCR service:', error);
        throw AppError.processingError('Failed to initialize OCR service: ' + (error as Error).message);
      }
    }
  }

  async extractReceiptData(filePath: string): Promise<ExtractedReceiptData> {
    try {
      // Ensure OCR service is initialized
      await this.ensureInitialized();

      // Extract text from PDF using OCR
      console.log('Extracting text from PDF...');
      const text = await this.ocrService.extractTextFromPdf(filePath);
      
      if (!text || text.trim().length === 0) {
        throw AppError.processingError('No text could be extracted from the PDF');
      }

      console.log('Text extracted successfully, sending to Gemini AI...\n', text);
      
      // Extract structured data using Gemini AI
      const data = await this.geminiService.extractReceiptData(text);
      
      console.log('Data extracted successfully:', data);
      return data;
    } catch (error) {
      console.error('Error in extractReceiptData:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.processingError('Failed to extract receipt data: ' + (error as Error).message);
    }
  }

  async saveReceiptData(filePath: string, extractedData: ExtractedReceiptData): Promise<Receipt> {
    try {
      // Create receipt with default values
      const receipt = {
        merchant_name: extractedData.merchantName || 'Unknown Merchant',
        purchased_at: extractedData.date ? new Date(extractedData.date) : new Date(),
        total_amount: extractedData.totalAmount || 0,
        tax_amount: extractedData.taxAmount || 0,
        payment_method: extractedData.paymentMethod || 'Unknown',
        receipt_number: extractedData.receiptNumber,
        items: extractedData.items,
        file_path: filePath
      } as Receipt;

      console.log('Saving receipt data:', receipt);
      return await this.receiptRepository.save(receipt);
    } catch (error) {
      console.error('Error saving receipt data:', error);
      throw AppError.databaseError('Failed to save receipt data: ' + (error as Error).message);
    }
  }

  async terminate(): Promise<void> {
    await this.ocrService.terminate();
  }
} 