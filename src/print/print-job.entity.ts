import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type PrintJobType =
  | 'mesa_ticket'
  | 'kitchen_order'
  | 'bar_order'
  | 'payment_receipt'
  | 'report_ticket';

export type PrintJobStatus = 'pendiente' | 'impreso' | 'error';

@Entity('print_jobs')
export class PrintJob {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: PrintJobType;

  @Column({ type: 'json' })
  data: any;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'impreso', 'error'],
    default: 'pendiente',
  })
  status: PrintJobStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'printed_at', type: 'datetime', nullable: true })
  printedAt: Date;
}
