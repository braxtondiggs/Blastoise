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

export type ImportSource = 'google_timeline' | 'apple_maps';

export interface ImportMetadata {
  errors?: Array<{
    place_name: string;
    address?: string;
    timestamp?: string;
    error: string;
    error_code?: string;
  }>;
  tier_statistics?: {
    tier1_matches: number;
    tier2_matches: number;
    tier3_matches: number;
    unverified: number;
  };
}

@Entity('import_history')
@Index('idx_import_history_user_id', ['user_id'])
@Index('idx_import_history_imported_at', ['imported_at'])
export class ImportHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 50 })
  source!: ImportSource;

  @CreateDateColumn({ type: 'timestamptz' })
  imported_at!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  job_id?: string;

  @Column({ type: 'integer', default: 0 })
  total_places!: number;

  @Column({ type: 'integer', default: 0 })
  visits_created!: number;

  @Column({ type: 'integer', default: 0 })
  visits_skipped!: number;

  @Column({ type: 'integer', default: 0 })
  new_venues_created!: number;

  @Column({ type: 'integer', nullable: true })
  existing_venues_matched?: number;

  @Column({ type: 'integer', nullable: true })
  processing_time_ms?: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: ImportMetadata;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
