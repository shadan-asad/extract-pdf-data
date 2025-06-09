import { DataSource } from 'typeorm';
import { ReceiptFile } from '../models/ReceiptFile';
import { Receipt } from '../models/Receipt';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(__dirname, '../../database/receipts.db'),
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  entities: [ReceiptFile, Receipt],
  migrations: [],
  subscribers: [],
});

export const initializeDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connection initialized');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}; 