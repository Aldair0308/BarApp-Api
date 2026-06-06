import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity('payment_items')
export class PaymentItem {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'payment_id', type: 'varchar', length: 36 })
  paymentId: string;

  @ManyToOne(() => Payment, (p) => p.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ name: 'order_item_id', type: 'varchar', length: 36 })
  orderItemId: string;

  @Column({ name: 'paid_qty', type: 'int' })
  paidQty: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;
}
