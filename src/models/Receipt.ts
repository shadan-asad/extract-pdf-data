import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ReceiptItem } from '../types/receipt';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'merchant_name', nullable: true, type: 'varchar', default: 'Unknown Merchant' })
  merchant_name!: string;

  @Column({ name: 'purchased_at', type: 'datetime', nullable: true, default: () => 'CURRENT_TIMESTAMP' })
  purchased_at!: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  total_amount!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  tax_amount!: number;

  @Column({ name: 'payment_method', nullable: true, type: 'varchar', default: 'Unknown' })
  payment_method!: string;

  @Column({ name: 'receipt_number', nullable: true, type: 'varchar' })
  receipt_number!: string | null;

  @Column({ name: 'items', type: 'simple-json', nullable: true, default: '[]' })
  items!: ReceiptItem[];

  @Column({ name: 'file_path', type: 'varchar' })
  file_path!: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at!: Date;
} 