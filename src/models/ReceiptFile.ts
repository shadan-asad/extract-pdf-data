import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('receipt_file')
export class ReceiptFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  file_name: string;

  @Column()
  file_path: string;

  @Column({ default: false })
  is_valid: boolean;

  @Column({ nullable: true })
  invalid_reason: string;

  @Column({ default: false })
  is_processed: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 