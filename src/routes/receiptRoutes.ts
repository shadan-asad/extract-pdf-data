import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController';
import { uploadMiddleware } from '../middleware/uploadMiddleware';

const router = Router();
const receiptController = new ReceiptController();

// Upload a new receipt
router.post('/upload', uploadMiddleware, receiptController.uploadReceipt.bind(receiptController));

// Get a specific receipt
router.get('/:id', receiptController.getReceipt.bind(receiptController));

// List all receipts with pagination
router.get('/', receiptController.listReceipts.bind(receiptController));

// Delete a receipt
router.delete('/:id', receiptController.deleteReceipt.bind(receiptController));

export default router; 