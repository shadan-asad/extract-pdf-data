# PDF Receipt Extraction System

A web application that extracts and manages data from PDF receipts using OCR/AI techniques. The system provides a RESTful API for uploading, validating, and processing PDF receipts, with automatic extraction of key information such as merchant name, purchase date, and total amount.

## Features

- Upload and validate PDF receipts
- Extract key details using OCR/AI
- Store extracted information in SQLite database
- RESTful API for receipt management
- File validation and error handling
- Comprehensive API documentation
- Pagination support for receipt listing
- Detailed error reporting

## Tech Stack

- Node.js
- Express.js
- TypeScript
- SQLite (TypeORM)
- Tesseract.js (OCR)
- PDF-parse
- Swagger/OpenAPI (API Documentation)
- Jest (Testing)

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd extract-pdf-data
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
PORT=3000
NODE_ENV=development
UPLOAD_DIR=uploads
```

4. Build the project:
```bash
npm run build
```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running. It provides:
- Interactive API documentation
- Request/response examples
- Schema definitions
- Try-it-out functionality

## API Endpoints

### Receipt Management

1. List Receipts
   - `GET /api/receipts`
   - Query Parameters:
     - `page` (default: 1): Page number
     - `limit` (default: 10, max: 100): Items per page
   - Returns: Paginated list of receipts

2. Get Receipt
   - `GET /api/receipts/:id`
   - Returns: Receipt details

3. Delete Receipt
   - `DELETE /api/receipts/:id`
   - Returns: Success message

### Receipt Processing

1. Upload Receipt
   - `POST /api/upload`
   - Content-Type: `multipart/form-data`
   - Body: `receipt` (PDF file)
   - Returns: File metadata

2. Validate Receipt
   - `POST /api/validate/:fileId`
   - Returns: Validation results and extracted data

3. Process Receipt
   - `POST /api/process/:fileId`
   - Returns: Processed receipt data

## Error Handling

The API uses a consistent error response format:

```json
{
  "status": "error",
  "type": "ERROR_TYPE",
  "message": "Error message",
  "details": [
    {
      "field": "field_name",
      "message": "Specific error message",
      "value": "invalid_value"
    }
  ]
}
```

Error Types:
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND_ERROR`: Resource not found
- `FILE_ERROR`: File operation failed
- `DATABASE_ERROR`: Database operation failed
- `PROCESSING_ERROR`: General processing error
- `OCR_ERROR`: OCR processing failed
- `UNAUTHORIZED_ERROR`: Authentication required
- `RATE_LIMIT_ERROR`: Too many requests

## Development

### Project Structure

```
extract-pdf-data/
├── src/
│   ├── config/          # Configuration files
│   │   ├── app.ts       # Express app setup
│   │   ├── database.ts  # Database configuration
│   │   └── swagger.ts   # API documentation
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   │   ├── fileService.ts
│   │   ├── ocrService.ts
│   │   └── receiptExtractionService.ts
│   ├── controllers/     # API controllers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
├── uploads/             # Uploaded files
├── tests/              # Test files
└── database/           # SQLite database
```

### Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 