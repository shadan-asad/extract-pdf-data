import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController';
import { uploadMiddleware } from '../middleware/uploadMiddleware';
import { validate, commonValidations } from '../middleware/validationMiddleware';
import { param } from 'express-validator';

const router = Router();
const receiptController = new ReceiptController();

/**
 * @swagger
 * /receipts:
 *   get:
 *     summary: List all receipts with pagination
 *     tags: [Receipts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of receipts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     receipts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Receipt'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/receipts', 
  commonValidations.pagination,
  receiptController.listReceipts.bind(receiptController)
);

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload a new receipt file
 *     tags: [Receipts]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: PDF receipt file
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/ReceiptFile'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', 
  uploadMiddleware,
  receiptController.uploadFile.bind(receiptController)
);

/**
 * @swagger
 * /validate/{fileId}:
 *   post:
 *     summary: Validate an uploaded receipt
 *     tags: [Receipts]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID of the uploaded file
 *     responses:
 *       200:
 *         description: Receipt validated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       allOf:
 *                         - $ref: '#/components/schemas/ReceiptFile'
 *                         - type: object
 *                           properties:
 *                             extracted_data:
 *                               type: object
 *                               properties:
 *                                 merchant_name:
 *                                   type: string
 *                                 purchased_at:
 *                                   type: string
 *                                   format: date-time
 *                                 total_amount:
 *                                   type: number
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/validate/:fileId',
  validate([
    param('fileId').isInt({ min: 1 }).withMessage('File ID must be a positive number')
  ]),
  receiptController.validateReceipt.bind(receiptController)
);

/**
 * @swagger
 * /process/{fileId}:
 *   post:
 *     summary: Process a validated receipt
 *     tags: [Receipts]
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID of the validated file
 *     responses:
 *       200:
 *         description: Receipt processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     receipt:
 *                       $ref: '#/components/schemas/Receipt'
 *                     extracted_items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           description:
 *                             type: string
 *                           amount:
 *                             type: number
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/process/:fileId',
  validate([
    param('fileId').isInt({ min: 1 }).withMessage('File ID must be a positive number')
  ]),
  receiptController.processReceipt.bind(receiptController)
);

/**
 * @swagger
 * /receipts/{id}:
 *   get:
 *     summary: Get a specific receipt
 *     tags: [Receipts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Receipt ID
 *     responses:
 *       200:
 *         description: Receipt details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     receipt:
 *                       $ref: '#/components/schemas/Receipt'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Receipt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/receipts/:id',
  validate([
    param('id').isInt({ min: 1 }).withMessage('Receipt ID must be a positive number')
  ]),
  receiptController.getReceipt.bind(receiptController)
);

/**
 * @swagger
 * /receipts/{id}:
 *   delete:
 *     summary: Delete a receipt
 *     tags: [Receipts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Receipt ID
 *     responses:
 *       200:
 *         description: Receipt deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Receipt deleted successfully
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Receipt not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/receipts/:id',
  validate([
    param('id').isInt({ min: 1 }).withMessage('Receipt ID must be a positive number')
  ]),
  receiptController.deleteReceipt.bind(receiptController)
);

export default router; 