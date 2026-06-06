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
import { OrderItemConfig } from './order-item-config.entity';

export type OrderItemStatus = 'pendiente' | 'en_proceso' | 'listo' | 'entregado';
export type OrderItemDestination = 'cocina' | 'barra' | 'otros';
export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado';

@Entity('order_items')
export class OrderItem {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'mesa_id', type: 'varchar', length: 36 })
  mesaId: string;

  @ManyToOne(() => Mesa, (m) => m.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mesa_id' })
  mesa: Mesa;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  productId: string;

  @Column({ name: 'product_name', type: 'varchar', length: 150 })
  productName: string;

  @Column({ name: 'base_price', type: 'decimal', precision: 10, scale: 2 })
  basePrice: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'paid_qty', type: 'int', default: 0 })
  paidQty: number;

  @Column({
    type: 'enum',
    enum: ['pendiente', 'en_proceso', 'listo', 'entregado'],
    default: 'pendiente',
  })
  status: OrderItemStatus;

  @Column({
    type: 'enum',
    enum: ['cocina', 'barra', 'otros'],
  })
  destination: OrderItemDestination;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: ['pendiente', 'parcial', 'pagado'],
    default: 'pendiente',
  })
  paymentStatus: PaymentStatus;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @Column({ name: 'added_by_name', type: 'varchar', length: 100 })
  addedByName: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  modifications: string;

  @OneToMany(() => OrderItemConfig, (c) => c.orderItem, { cascade: true })
  configurations: OrderItemConfig[];
}
