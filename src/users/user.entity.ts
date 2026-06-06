import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserRole = 'admin' | 'mesero' | 'cocina' | 'barra';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'char', length: 4 })
  pin: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'mesero', 'cocina', 'barra'],
    default: 'mesero',
  })
  role: UserRole;

  @Column({ type: 'tinyint', default: 1 })
  active: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
