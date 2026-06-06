import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';
import { ConfigOption } from './config-option.entity';

@Entity('config_groups')
export class ConfigGroup {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'product_id', type: 'varchar', length: 36 })
  productId: string;

  @ManyToOne(() => Product, (p) => p.configurations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'tinyint', default: 0 })
  required: number;

  @Column({
    type: 'enum',
    enum: ['single', 'multiple'],
    default: 'single',
  })
  type: 'single' | 'multiple';

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => ConfigOption, (o) => o.group, { cascade: true })
  options: ConfigOption[];
}
