import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController';
import { upload } from '../middleware/upload';

const router = Router();
const receiptController = new ReceiptController();

// File upload route - using array of middleware
router.post('/upload', ...upload, receiptController.uploadFile);

// File validation route
router.post('/validate/:id', receiptController.validateFile);

// Get all files
router.get('/files', receiptController.getAllFiles);

// Get single file
router.get('/files/:id', receiptController.getFile);

// Delete file
router.delete('/files/:id', receiptController.deleteFile);

export const receiptRoutes = router; 