import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ConfigGroup } from './config-group.entity';

@Entity('config_options')
export class ConfigOption {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'group_id', type: 'varchar', length: 36 })
  groupId: string;

  @ManyToOne(() => ConfigGroup, (g) => g.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: ConfigGroup;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    name: 'extra_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  extraPrice: number;

  @Column({ name: 'is_default', type: 'tinyint', default: 0 })
  isDefault: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
