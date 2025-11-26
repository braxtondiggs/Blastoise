import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity';

export type SharingPreference = 'never' | 'ask' | 'always';

export interface NotificationPreferences {
  visit_detected?: boolean;
  visit_ended?: boolean;
  new_nearby_venues?: boolean;
  weekly_summary?: boolean;
  sharing_activity?: boolean;
}

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryColumn('uuid')
  user_id!: string;

  @Column({ type: 'boolean', default: true })
  location_tracking_enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  background_tracking_enabled!: boolean;

  @Column({ type: 'varchar', length: 20, default: 'ask' })
  sharing_preference!: SharingPreference;

  @Column({ type: 'int', nullable: true })
  data_retention_months!: number | null;

  @Column({ type: 'boolean', default: true })
  notifications_enabled!: boolean;

  @Column({ type: 'jsonb', default: {} })
  notification_preferences!: NotificationPreferences;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
