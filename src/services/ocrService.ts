import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { AppError } from '../types/errors';
import pdf from 'pdf-parse';

export class OCRService {
  private worker: Tesseract.Worker | null = null;

  async initialize(): Promise<void> {
    try {
      this.worker = await createWorker('eng');
      await this.worker.loadLanguage('eng');
      // Configure Tesseract for better accuracy
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$.,/-: ',
        tessedit_pageseg_mode: '6', // Assume uniform text block
        preserve_interword_spaces: '1'
      });
      await this.worker.initialize('eng');
    } catch (error) {
      throw AppError.processingError('Failed to initialize OCR service');
    }
  }

  async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      if (!this.worker) {
        await this.initialize();
      }

      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        throw AppError.fileError(`File not found at path: ${filePath}`);
      }

      // First, try to extract text using pdf-parse
      const dataBuffer = fs.readFileSync(fullPath);
      const pdfData = await pdf(dataBuffer, {
        pagerender: this.renderPage,
        max: 0 // No page limit
      });

      let extractedText = '';

      // If pdf-parse successfully extracted text, clean and normalize it
      if (pdfData.text && pdfData.text.trim().length > 0) {
        extractedText = this.normalizeText(pdfData.text);
        console.log('Text extracted using pdf-parse:', extractedText);
      }

      // If pdf-parse couldn't extract text or the text is too short, use Tesseract
      if (!extractedText || extractedText.length < 50) {
        if (!this.worker) {
          throw AppError.processingError('OCR service not initialized');
        }

        const { data: { text } } = await this.worker.recognize(fullPath);
        extractedText = this.normalizeText(text);
        console.log('Text extracted using Tesseract:', extractedText);
      }

      return extractedText;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.processingError('Failed to extract text from PDF');
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

  private async renderPage(pageData: any): Promise<string> {
    // This function can be used to pre-process the page before OCR
    // For now, we'll just return the raw text
    return pageData.getTextContent().then((content: any) => {
      return content.items.map((item: any) => item.str).join(' ');
    });
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