import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Visit } from './visit.entity';

@Entity('shared_visits')
@Index('idx_shared_visits_visit_id', ['visit_id'])
export class SharedVisit {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'uuid' })
  visit_id!: string;

  @Column({ type: 'varchar', length: 200 })
  venue_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  venue_city?: string;

  @Column({ type: 'date' })
  visit_date!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  shared_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at?: Date;

  @Column({ type: 'integer', default: 0 })
  view_count!: number;

  @ManyToOne(() => Visit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visit_id' })
  visit!: Relation<Visit>;
}
