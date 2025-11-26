import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, type: 'varchar', length: 64 })
  @Index()
  token_hash!: string;

  @Column({ type: 'uuid' })
  @Index()
  user_id!: string;

  @Column({ type: 'timestamp' })
  @Index()
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  revoked_at!: Date | null;

  @ManyToOne(() => User, (user) => user.refresh_tokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
