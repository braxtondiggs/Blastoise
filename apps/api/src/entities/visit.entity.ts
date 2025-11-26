import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity';

export type DetectionMethod = 'auto' | 'manual';
export type VisitSource = 'auto_detect' | 'google_import' | 'manual';

@Entity('visits')
@Index('idx_visits_user_id', ['user_id'])
@Index('idx_visits_arrival_time', ['arrival_time'])
@Index('idx_visits_user_arrival', ['user_id', 'arrival_time'])
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'uuid' })
  venue_id!: string;

  @Column({ type: 'timestamptz' })
  arrival_time!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  departure_time?: Date;

  @Column({ type: 'integer', nullable: true })
  duration_minutes?: number;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'manual' })
  detection_method!: DetectionMethod;

  @Column({ type: 'varchar', length: 20, nullable: true })
  source?: VisitSource;

  @Column({ type: 'timestamptz', nullable: true })
  imported_at?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  // Note: Server-stored visits are always synced (synced=true is added at serialization)
}
