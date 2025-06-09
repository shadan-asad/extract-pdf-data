import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import { validate, commonValidations } from '../middleware/validationMiddleware';
import { param } from 'express-validator';

const router = Router();
const receiptController = new ReceiptController();

// List all receipts with pagination (most generic route)
router.get('/receipts', 
  commonValidations.pagination,
  receiptController.listReceipts.bind(receiptController)
);

// Upload a new receipt file
router.post('/upload', 
  uploadMiddleware,
  receiptController.uploadFile.bind(receiptController)
);

// Validate an uploaded receipt
router.post('/validate/:fileId',
  validate([
    param('fileId').isInt({ min: 1 }).withMessage('File ID must be a positive number')
  ]),
  receiptController.validateReceipt.bind(receiptController)
);

// Process a validated receipt
router.post('/process/:fileId',
  validate([
    param('fileId').isInt({ min: 1 }).withMessage('File ID must be a positive number')
  ]),
  receiptController.processReceipt.bind(receiptController)
);

// Get a specific receipt
router.get('/receipts/:id',
  validate([
    param('id').isInt({ min: 1 }).withMessage('Receipt ID must be a positive number')
  ]),
  receiptController.getReceipt.bind(receiptController)
);

// Delete a receipt
router.delete('/receipts/:id',
  validate([
    param('id').isInt({ min: 1 }).withMessage('Receipt ID must be a positive number')
  ]),
  receiptController.deleteReceipt.bind(receiptController)
);

export default router; 