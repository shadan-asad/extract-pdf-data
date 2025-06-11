import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { AppError } from '../types/errors';
import { ExtractedReceiptData } from '../types/receipt';

export class GeminiService {
  private model: any;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    // Using gemini-pro model which is available in free tier
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Configure safety settings
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    this.model.safetySettings = safetySettings;
  }

  async extractReceiptData(text: string): Promise<ExtractedReceiptData> {
    try {
      const prompt = `You are a receipt data extraction expert. Extract the following information from the receipt text below. 
      Return the data in a JSON format with these exact fields:
      {
        "merchantName": "string (name of the company)",
        "date": "string (date of transaction in YYYY-MM-DD format)",
        "totalAmount": "number (total amount paid)",
        "taxAmount": "number (tax amount)",
        "items": [
          {
            "name": "string (item name)",
            "quantity": "number (quantity purchased)",
            "price": "number (price per item)",
            "total": "number (total for this item)"
          }
        ],
        "paymentMethod": "string (payment method used)",
        "receiptNumber": "string (receipt/invoice number if available)"
      }

      Rules:
      1. If a field cannot be found, use null for that field
      2. For dates, convert to YYYY-MM-DD format
      3. For amounts, extract only the number (no currency symbols)
      4. For items, include all items found in the receipt
      5. If multiple items have the same name, combine them and sum their quantities and totals
      6. If tax is not explicitly mentioned, calculate it as the difference between total and sum of items
      7. If payment method is not found, use "Unknown"
      8. If receipt number is not found, use null
      9. Return ONLY the raw JSON object, no markdown formatting, no code blocks, no additional text

      Receipt text:
      ${text}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const extractedText = response.text();

      // Clean the response text to handle markdown formatting
      const cleanedText = this.cleanGeminiResponse(extractedText);
      console.log('Cleaned Gemini response:', cleanedText);

      // Parse the JSON response
      try {
        const data = JSON.parse(cleanedText);
        return this.validateAndTransformData(data);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.error('Raw response:', extractedText);
        console.error('Cleaned response:', cleanedText);
        throw AppError.processingError('Failed to parse receipt data from AI response');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw AppError.processingError('Failed to extract receipt data using AI: ' + (error as Error).message);
    }
  }

  private cleanGeminiResponse(text: string): string {
    // Remove markdown code block formatting
    let cleaned = text.replace(/```json\s*|\s*```/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Remove any markdown formatting that might be present
    cleaned = cleaned.replace(/^`|`$/g, '');
    
    // If the response starts with a newline, remove it
    cleaned = cleaned.replace(/^\n+/, '');
    
    // If the response ends with a newline, remove it
    cleaned = cleaned.replace(/\n+$/, '');
    
    // Log the cleaning process for debugging
    console.log('Response cleaning steps:', {
      original: text,
      cleaned: cleaned
    });
    
    return cleaned;
  }

  private validateAndTransformData(data: any): ExtractedReceiptData {
    // Basic structure validation
    if (!data || typeof data !== 'object') {
      throw AppError.processingError('Invalid data structure received from AI');
    }

    // Ensure all required fields are present with correct types
    const validatedData: ExtractedReceiptData = {
      merchantName: typeof data.merchantName === 'string' ? data.merchantName : null,
      date: typeof data.date === 'string' ? data.date : null,
      totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : null,
      taxAmount: typeof data.taxAmount === 'number' ? data.taxAmount : null,
      items: Array.isArray(data.items) ? data.items.map((item: any) => ({
        name: typeof item.name === 'string' ? item.name : 'Unknown Item',
        quantity: typeof item.quantity === 'number' ? item.quantity : 1,
        price: typeof item.price === 'number' ? item.price : 0,
        total: typeof item.total === 'number' ? item.total : 0
      })) : [],
      paymentMethod: typeof data.paymentMethod === 'string' ? data.paymentMethod : 'Unknown',
      receiptNumber: typeof data.receiptNumber === 'string' ? data.receiptNumber : null
    };

    // Only validate that we have some essential data
    if (!validatedData.merchantName && !validatedData.totalAmount && validatedData.items.length === 0) {
      throw AppError.processingError('Insufficient data extracted from receipt');
    }

    return validatedData;
  }

  private validateDate(date: string | null): string | null {
    if (!date) return null;
    return date; // Accept any string format as is
  }

  private validateNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
} 