import { OCRService } from './ocrService';
import { AppError } from '../types/errors';
import { Receipt } from '../models/Receipt';
import { AppDataSource } from '../config/database';

interface ExtractedReceiptData {
  merchantName: string;
  purchaseDate: Date;
  totalAmount: number;
  items?: Array<{
    description: string;
    amount: number;
  }>;
}

export class ReceiptExtractionService {
  private ocrService: OCRService;
  private receiptRepository = AppDataSource.getRepository(Receipt);
  private initialized: boolean = false;

  constructor() {
    this.ocrService = new OCRService();
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

      // Extract text from PDF
      const text = await this.ocrService.extractTextFromPdf(filePath);
      
      // Extract data using regex patterns
      const data = this.parseReceiptText(text);
      
      // Validate extracted data
      this.validateExtractedData(data);
      
      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.processingError('Failed to extract receipt data');
    }
  }

  private parseReceiptText(text: string): ExtractedReceiptData {
    // Common patterns for receipt data
    const patterns = {
      // Look for date patterns (e.g., MM/DD/YYYY, DD-MM-YYYY)
      date: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
      
      // Enhanced total amount patterns with more variations
      total: /(?:total|amount|sum|subtotal|balance|final|due|payment|paid|charge)[\s:]*[$]?\s*(\d+[.,]\d{2})/i,
      
      // Alternative total pattern for amounts at the end of lines
      totalAlt: /(\d+[.,]\d{2})\s*(?:total|amount|sum|subtotal|balance|final|due|payment|paid|charge)?$/im,
      
      // Generic merchant name patterns
      merchant: {
        // Look for merchant name at the start of receipt (most common)
        header: /^([A-Z][A-Za-z0-9\s&]+)(?:\n|$)/m,
        // Look for merchant name in first few lines
        topLines: /^([A-Z][A-Za-z0-9\s&]{3,})(?:\n|$)/m,
        // Look for merchant name in footer (often includes website)
        footer: /([A-Z][A-Za-z0-9\s&]{3,})\.(?:COM|CO\.UK|NET|ORG|IO|APP|STORE|SHOP|MARKET|RETAIL|INC|LLC|LTD|CORP|CO|CO\.)?/i
      }
    };

    // Extract date
    const dateMatch = text.match(patterns.date);
    const purchaseDate = dateMatch ? this.parseDate(dateMatch[0]) : new Date();

    // Extract total amount with enhanced patterns
    let totalAmount = 0;
    const totalMatch = text.match(patterns.total);
    const totalAltMatch = text.match(patterns.totalAlt);
    
    // Log the extracted text for debugging
    console.log('Extracted text from PDF:', text);
    
    // Try to find total amount in different ways
    if (totalMatch) {
      totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
      console.log('Found total amount using primary pattern:', totalAmount);
    } else if (totalAltMatch) {
      totalAmount = parseFloat(totalAltMatch[1].replace(',', '.'));
      console.log('Found total amount using alternative pattern:', totalAmount);
    } else {
      // Try to find any amount that looks like a total
      const allAmounts = text.match(/\$?\s*\d+[.,]\d{2}/g) || [];
      if (allAmounts.length > 0) {
        // Sort amounts in descending order and take the largest
        const amounts = allAmounts
          .map(amount => parseFloat(amount.replace(/[$,]/g, '')))
          .sort((a, b) => b - a);
        
        if (amounts.length > 0) {
          totalAmount = amounts[0];
          console.log('Found total amount by taking largest amount:', totalAmount);
        }
      }
      
      if (!totalAmount) {
        console.log('No total amount found in text');
      }
    }

    // Extract merchant name with enhanced fallback methods
    let merchantName = 'Unknown Merchant';
    
    // Try header pattern first (most common location)
    const headerMatch = text.match(patterns.merchant.header);
    if (headerMatch) {
      merchantName = this.cleanMerchantName(headerMatch[1]);
      console.log('Found merchant name in header:', merchantName);
    } else {
      // Try top lines pattern
      const topLinesMatch = text.match(patterns.merchant.topLines);
      if (topLinesMatch) {
        merchantName = this.cleanMerchantName(topLinesMatch[1]);
        console.log('Found merchant name in top lines:', merchantName);
      } else {
        // Try footer pattern
        const footerMatch = text.match(patterns.merchant.footer);
        if (footerMatch) {
          merchantName = this.cleanMerchantName(footerMatch[1]);
          console.log('Found merchant name in footer:', merchantName);
        } else {
          // Last resort: look for any line that might be a merchant name
          const lines = text.split('\n');
          for (const line of lines.slice(0, 10)) { // Check first 10 lines
            const cleanLine = this.cleanMerchantName(line.trim());
            // Look for lines that:
            // 1. Start with a capital letter
            // 2. Contain only letters, numbers, spaces, and common business characters
            // 3. Are at least 3 characters long
            // 4. Don't look like a date, amount, or other receipt data
            if (cleanLine && 
                /^[A-Z][A-Za-z0-9\s&]+$/.test(cleanLine) && 
                cleanLine.length >= 3 &&
                !/^\d+[.,]\d{2}$/.test(cleanLine) && // Not an amount
                !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(cleanLine) && // Not a date
                !/^(?:total|amount|sum|subtotal|balance|final|due|payment|paid|charge)$/i.test(cleanLine)) { // Not a receipt term
              merchantName = cleanLine;
              console.log('Found merchant name in first 10 lines:', merchantName);
              break;
            }
          }
        }
      }
    }

    // Additional validation for merchant name
    if (merchantName === 'Unknown Merchant' || merchantName.length < 3) {
      console.log('Could not find valid merchant name');
      throw AppError.validationError('Could not extract merchant name from receipt');
    }

    return {
      merchantName,
      purchaseDate,
      totalAmount,
      items: this.extractItems(text)
    };
  }

  private parseDate(dateStr: string): Date {
    // Handle different date formats
    const formats = [
      /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // MM/DD/YYYY
      /(\d{1,2})[-/](\d{1,2})[-/](\d{2})/,  // MM/DD/YY
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/   // YYYY/MM/DD
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (match[1].length === 4) {
          // YYYY/MM/DD format
          return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
        } else {
          // MM/DD/YYYY or MM/DD/YY format
          const year = parseInt(match[3]);
          const fullYear = year < 100 ? 2000 + year : year;
          return new Date(fullYear, parseInt(match[1]) - 1, parseInt(match[2]));
        }
      }
    }

    return new Date(); // Default to current date if parsing fails
  }

  private extractItems(text: string): Array<{ description: string; amount: number }> {
    const items: Array<{ description: string; amount: number }> = [];
    const lines = text.split('\n');

    // Look for lines that might be items (containing description and amount)
    const itemPattern = /(.+?)\s+(\d+[.,]\d{2})$/;

    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match) {
        items.push({
          description: match[1].trim(),
          amount: parseFloat(match[2].replace(',', '.'))
        });
      }
    }

    return items;
  }

  private validateExtractedData(data: ExtractedReceiptData): void {
    if (!data.merchantName || data.merchantName === 'Unknown Merchant') {
      throw AppError.validationError('Could not extract merchant name from receipt');
    }

    if (!data.totalAmount || data.totalAmount <= 0) {
      throw AppError.validationError('Could not extract valid total amount from receipt');
    }

    if (!(data.purchaseDate instanceof Date) || isNaN(data.purchaseDate.getTime())) {
      throw AppError.validationError('Could not extract valid purchase date from receipt');
    }
  }

  async saveReceiptData(filePath: string, extractedData: ExtractedReceiptData): Promise<Receipt> {
    try {
      const receipt = new Receipt();
      receipt.merchant_name = extractedData.merchantName;
      receipt.purchased_at = extractedData.purchaseDate;
      receipt.total_amount = extractedData.totalAmount;
      receipt.file_path = filePath;

      return await this.receiptRepository.save(receipt);
    } catch (error) {
      throw AppError.databaseError('Failed to save receipt data');
    }
  }

  async terminate(): Promise<void> {
    await this.ocrService.terminate();
  }

  private cleanMerchantName(name: string): string {
    return name
      // Remove special characters but keep letters, numbers, spaces, and common business characters
      .replace(/[^A-Za-z0-9\s&.,'-]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Remove leading/trailing spaces and common business suffixes
      .replace(/\s+(?:INC|LLC|LTD|CORP|CO|CO\.|STORE|SHOP|MARKET|RETAIL)$/i, '')
      // Trim whitespace
      .trim();
  }
} 