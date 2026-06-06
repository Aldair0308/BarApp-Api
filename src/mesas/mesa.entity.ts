import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from '../orders/order-item.entity';
import { Payment } from '../payments/payment.entity';

export type MesaStatus = 'activa' | 'cerrada';

@Entity('mesas')
export class Mesa {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'table_number', type: 'int' })
  tableNumber: number;

  @Column({ name: 'client_name', type: 'varchar', length: 150 })
  clientName: string;

  @Column({ name: 'waiter_id', type: 'varchar', length: 36 })
  waiterId: string;

  @Column({ name: 'waiter_name', type: 'varchar', length: 100 })
  waiterName: string;

  @Column({
    type: 'enum',
    enum: ['activa', 'cerrada'],
    default: 'activa',
  })
  status: MesaStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'closed_at', type: 'datetime', nullable: true })
  closedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (i) => i.mesa)
  items: OrderItem[];

  @OneToMany(() => Payment, (p) => p.mesa)
  payments: Payment[];
}
