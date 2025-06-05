import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('receipt')
export class Receipt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime' })
  purchased_at: Date;

  @Column()
  merchant_name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  total_amount: number;

  @Column()
  file_path: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 