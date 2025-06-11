import { convert } from 'pdf-poppler';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { AppError } from '../types/errors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PdfImageService {
  private readonly outputDir: string;
  private readonly quality: number = 80;
  private readonly dpi: number = 150; // Reduced DPI for faster processing

  constructor() {
    this.outputDir = path.join(process.cwd(), 'temp_images');
    this.ensureOutputDirectory();
    console.log('PdfImageService initialized with output directory:', this.outputDir);
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      console.log('Creating output directory:', this.outputDir);
      fs.mkdirSync(this.outputDir, { recursive: true });
    } else {
      console.log('Output directory already exists:', this.outputDir);
    }
  }

  private async checkPopplerInstallation(): Promise<void> {
    try {
      console.log('Checking poppler installation...');
      const { stdout } = await execAsync('which pdftoppm');
      console.log('Poppler found at:', stdout.trim());
    } catch (error) {
      console.error('Poppler not found:', error);
      throw AppError.processingError('Poppler (pdftoppm) is not installed. Please install it using: brew install poppler');
    }
  }

  async convertPdfToImages(pdfPath: string): Promise<string[]> {
    let outputDir = '';
    try {
      console.log('=== Starting PDF conversion process ===');
      console.log('Input PDF path:', pdfPath);
      
      // Check poppler installation first
      await this.checkPopplerInstallation();
      
      const fullPdfPath = path.join(process.cwd(), pdfPath);
      console.log('Full PDF path:', fullPdfPath);

      if (!fs.existsSync(fullPdfPath)) {
        console.error('PDF file not found at path:', fullPdfPath);
        throw AppError.fileError('PDF file not found');
      }

      // Check file size
      const stats = await fs.promises.stat(fullPdfPath);
      console.log('PDF file stats:', {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      });
      
      if (stats.size === 0) {
        console.error('PDF file is empty');
        throw AppError.fileError('PDF file is empty');
      }
      if (stats.size > 10 * 1024 * 1024) {
        console.error('PDF file is too large:', stats.size, 'bytes');
        throw AppError.fileError('PDF file is too large (max 10MB)');
      }

      // Generate unique output directory
      const timestamp = Date.now();
      outputDir = path.join(this.outputDir, `pdf_${timestamp}`);
      console.log('Creating temporary output directory:', outputDir);
      fs.mkdirSync(outputDir, { recursive: true });

      // Configure conversion options - simplified for better performance
      const options = {
        format: 'jpeg',
        out_dir: outputDir,
        out_prefix: 'page',
        page: 1, // Convert only first page for now
        dpi: this.dpi,
        antialias: false, // Disable antialiasing for faster processing
        jpegopt: {
          quality: this.quality,
          progressive: false // Disable progressive JPEG for faster processing
        }
      };
      console.log('PDF conversion options:', JSON.stringify(options, null, 2));

      try {
        // Convert PDF to images using direct pdftoppm command for better control
        console.log('Starting PDF to image conversion...');
        const outputPrefix = path.join(outputDir, 'page');
        const cmd = `pdftoppm -jpeg -r ${this.dpi} -jpegopt quality=${this.quality} -singlefile "${fullPdfPath}" "${outputPrefix}"`;
        console.log('Executing command:', cmd);
        
        const { stdout, stderr } = await execAsync(cmd);
        if (stderr) {
          console.warn('pdftoppm stderr:', stderr);
        }
        console.log('pdftoppm stdout:', stdout);

        // Get list of generated files
        const files = await fs.promises.readdir(outputDir);
        console.log('Generated files:', files);

        // Process and save each image
        console.log('Starting image processing...');
        const processedImagePaths: string[] = [];
        for (const file of files) {
          if (!file.endsWith('.jpg')) continue;

          const imagePath = path.join(outputDir, file);
          console.log(`Processing image: ${file}`, {
            path: imagePath
          });

          try {
            // Process image for better OCR
            console.log(`Applying image processing to ${file}...`);
            const processedPath = path.join(outputDir, `processed_${file}`);
            await sharp(imagePath)
              .grayscale()
              .normalize()
              .jpeg({ quality: this.quality })
              .toFile(processedPath);

            // Verify the processed image
            const processedStats = await fs.promises.stat(processedPath);
            console.log(`Image processed successfully:`, {
              path: processedPath,
              size: processedStats.size,
              created: processedStats.birthtime
            });

            // Remove original file
            await fs.promises.unlink(imagePath);
            console.log('Original file removed:', imagePath);

            processedImagePaths.push(processedPath);
          } catch (processError) {
            console.error(`Error processing image ${file}:`, {
              error: processError,
              message: processError.message,
              stack: processError.stack
            });
            // Continue with other images even if one fails
          }
        }

        if (processedImagePaths.length === 0) {
          console.error('No images were successfully processed');
          throw AppError.processingError('Failed to process any images from the PDF');
        }

        console.log('=== PDF conversion process completed successfully ===');
        console.log('Processed images:', processedImagePaths);
        return processedImagePaths;
      } catch (conversionError) {
        console.error('PDF conversion error details:', {
          error: conversionError,
          message: conversionError.message,
          stack: conversionError.stack,
          type: conversionError.constructor.name
        });
        throw AppError.processingError('Failed to convert PDF to images: ' + (conversionError as Error).message);
      }
    } catch (error) {
      console.error('Error in convertPdfToImages:', {
        error,
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      
      // Clean up the output directory if it exists
      if (outputDir && fs.existsSync(outputDir)) {
        try {
          console.log('Cleaning up output directory:', outputDir);
          await fs.promises.rm(outputDir, { recursive: true, force: true });
          console.log('Output directory cleaned up successfully');
        } catch (cleanupError) {
          console.error('Error cleaning up output directory:', {
            error: cleanupError,
            message: cleanupError.message,
            stack: cleanupError.stack
          });
        }
      }

      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.processingError('Failed to convert PDF to images: ' + (error as Error).message);
    }
  }

  async cleanupImages(imagePaths: string[]): Promise<void> {
    try {
      console.log('Starting cleanup of images:', imagePaths);
      for (const imagePath of imagePaths) {
        if (fs.existsSync(imagePath)) {
          console.log('Deleting image:', imagePath);
          await fs.promises.unlink(imagePath);
          console.log('Image deleted successfully:', imagePath);
        } else {
          console.log('Image not found for cleanup:', imagePath);
        }
      }
      // Remove the parent directory if it exists
      const parentDir = path.dirname(imagePaths[0]);
      if (fs.existsSync(parentDir)) {
        console.log('Deleting parent directory:', parentDir);
        await fs.promises.rm(parentDir, { recursive: true, force: true });
        console.log('Parent directory deleted successfully');
      } else {
        console.log('Parent directory not found for cleanup:', parentDir);
      }
    } catch (error) {
      console.error('Error during cleanup:', {
        error,
        message: error.message,
        stack: error.stack
      });
    }
  }
} 