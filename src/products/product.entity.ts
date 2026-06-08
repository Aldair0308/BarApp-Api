import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ConfigGroup } from './config-group.entity';

export type ProductCategory = 'cocina' | 'barra' | 'otros';

export type ProductDestination = 'cocina' | 'barra' | 'otros';

@Entity('products')
export class Product {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: ['cocina', 'barra', 'otros'],
  })
  category: ProductCategory;

  @Column({
    type: 'enum',
    enum: ['cocina', 'barra', 'otros'],
    default: 'cocina',
  })
  destination: ProductDestination;

  @Column({ type: 'tinyint', default: 1 })
  available: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ConfigGroup, (g) => g.product, { cascade: true })
  configurations: ConfigGroup[];
}
