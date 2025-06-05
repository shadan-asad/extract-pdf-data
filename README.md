# PDF Receipt Extraction System

A web application that extracts and manages data from PDF receipts using OCR/AI techniques.

## Features

- Upload and validate PDF receipts
- Extract key details using OCR/AI
- Store extracted information in SQLite database
- RESTful API for receipt management
- File validation and error handling

## Tech Stack

- Node.js
- Express.js
- TypeScript
- SQLite (TypeORM)
- Tesseract.js (OCR)
- PDF-parse
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
```
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

## API Endpoints

1. Upload Receipt
   - POST `/upload`
   - Uploads a PDF receipt file

2. Validate Receipt
   - POST `/validate`
   - Validates the uploaded PDF file

3. Process Receipt
   - POST `/process`
   - Extracts data from the receipt using OCR

4. List Receipts
   - GET `/receipts`
   - Retrieves all stored receipts

5. Get Receipt Details
   - GET `/receipts/{id}`
   - Retrieves details of a specific receipt

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

## Project Structure

```
extract-pdf-data/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Database models
│   ├── services/        # Business logic
│   ├── controllers/     # API controllers
│   ├── routes/          # API routes
│   ├── middleware/      # Custom middleware
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
├── uploads/             # Uploaded files
├── database/            # SQLite database
└── tests/              # Test files
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC 