import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export type MovementType = 'restock' | 'sale' | 'adjustment' | 'cancel';

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'inventory_id', type: 'varchar', length: 36 })
  inventoryId: string;

  @Column({
    type: 'enum',
    enum: ['restock', 'sale', 'adjustment', 'cancel'],
  })
  type: MovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'reference_id', type: 'varchar', length: 36, nullable: true })
  referenceId: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string;
}
