export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ExtractedReceiptData {
  merchantName: string | null;
  date: string | null;
  totalAmount: number | null;
  taxAmount: number | null;
  items: ReceiptItem[];
  paymentMethod: string;
  receiptNumber: string | null;
} 