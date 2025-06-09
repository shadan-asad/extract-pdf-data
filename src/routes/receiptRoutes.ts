import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController';
import { uploadMiddleware } from '../middleware/uploadMiddleware';

const router = Router();
const receiptController = new ReceiptController();

// List all receipts with pagination (most generic route)
router.get('/receipts', receiptController.listReceipts.bind(receiptController));

// Upload a new receipt file
router.post('/upload', uploadMiddleware, receiptController.uploadFile.bind(receiptController));

// Validate an uploaded receipt
router.post('/validate/:fileId', receiptController.validateReceipt.bind(receiptController));

// Process a validated receipt
router.post('/process/:fileId', receiptController.processReceipt.bind(receiptController));

// Get a specific receipt (more specific route)
router.get('/receipts/:id', receiptController.getReceipt.bind(receiptController));

// Delete a receipt
router.delete('/:id', receiptController.deleteReceipt.bind(receiptController));

export default router; 