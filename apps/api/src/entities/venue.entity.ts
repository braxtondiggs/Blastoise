import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type VenueType = 'brewery' | 'winery';
export type VenueSource = 'osm' | 'brewerydb' | 'manual' | 'google_import' | 'user_created' | 'auto_detect';
export type VerificationTier = 1 | 2 | 3;

@Entity('venues')
@Index('idx_venues_name', ['name'])
@Index('idx_venues_location', ['latitude', 'longitude'])
@Index('idx_venues_google_place_id', ['google_place_id'])
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  country?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: 'varchar', length: 20 })
  venue_type!: VenueType;

  @Column({ type: 'varchar', length: 20 })
  source!: VenueSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source_id?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  google_place_id?: string;

  @Column({ type: 'smallint', nullable: true })
  verification_tier?: VerificationTier;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  is_closed!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  closed_at?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_verified_at?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
