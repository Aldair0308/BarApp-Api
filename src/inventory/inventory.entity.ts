import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('inventory')
export class Inventory {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36, unique: true })
  productId: string;

  @Column({ name: 'product_name', type: 'varchar', length: 150 })
  productName: string;

  @Column({ name: 'current_stock', type: 'int', default: 0 })
  currentStock: number;

  @Column({ name: 'min_stock', type: 'int', default: 5 })
  minStock: number;

  @Column({ name: 'max_stock', type: 'int', default: 30 })
  maxStock: number;

  @Column({ type: 'varchar', length: 20, default: 'pza' })
  unit: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({
    name: 'last_restocked',
    type: 'datetime',
    nullable: true,
  })
  lastRestocked: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
