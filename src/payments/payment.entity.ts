import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Mesa } from '../mesas/mesa.entity';
import { PaymentItem } from './payment-item.entity';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia';

@Entity('payments')
export class Payment {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'mesa_id', type: 'varchar', length: 36 })
  mesaId: string;

  @ManyToOne(() => Mesa, (m) => m.payments)
  @JoinColumn({ name: 'mesa_id' })
  mesa: Mesa;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['efectivo', 'tarjeta', 'transferencia'],
  })
  paymentMethod: PaymentMethod;

  @CreateDateColumn({ name: 'paid_at' })
  paidAt: Date;

  @Column({ name: 'paid_by', type: 'varchar', length: 36 })
  paidBy: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string;

  @OneToMany(() => PaymentItem, (pi) => pi.payment, { cascade: true })
  items: PaymentItem[];
}
