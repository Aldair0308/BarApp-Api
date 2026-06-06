import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('order_item_configs')
export class OrderItemConfig {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'order_item_id', type: 'varchar', length: 36 })
  orderItemId: string;

  @ManyToOne(() => OrderItem, (i) => i.configurations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  @Column({ name: 'group_id', type: 'varchar', length: 36 })
  groupId: string;

  @Column({ name: 'group_name', type: 'varchar', length: 100 })
  groupName: string;

  @Column({ name: 'option_id', type: 'varchar', length: 36 })
  optionId: string;

  @Column({ name: 'option_name', type: 'varchar', length: 100 })
  optionName: string;

  @Column({
    name: 'extra_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  extraPrice: number;
}
