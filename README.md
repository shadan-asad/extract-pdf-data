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
git clone github.com/shadan-asad/extract-pdf-data
cd extract-pdf-data
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
GEMINI_API_KEY=your_api_key
PORT=3000
NODE_ENV=development
UPLOAD_DIR=uploads
```
OR Do this:
```
export GEMINI_API_KEY=your_api_key
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
│   ├── config/                  # Configuration files (Express, DB, Swagger)
│   ├── controllers/             # API controllers
│   ├── middleware/              # Custom middleware (error, auth, etc.)
│   ├── models/                  # Database models (TypeORM entities)
│   ├── routes/                  # API route definitions
│   ├── services/                # Business logic (file, OCR, extraction)
│   ├── types/                   # TypeScript types and interfaces
│   ├── utils/                   # Utility/helper functions
│   └── index.ts                 # App entry point
├── uploads/                     # Uploaded PDF files
├── tests/                       # Unit and integration tests
├── database/                    # SQLite database file(s)
├── .env                         # Environment variables
├── package.json                 # Project metadata and scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 