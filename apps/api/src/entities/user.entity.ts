import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { UserPreferences } from './user-preferences.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, type: 'varchar', length: 255 })
  @Index()
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @OneToMany(() => RefreshToken, (token) => token.user, { cascade: true })
  refresh_tokens!: Relation<RefreshToken>[];

  @OneToMany(() => PasswordResetToken, (token) => token.user, {
    cascade: true,
  })
  password_reset_tokens!: Relation<PasswordResetToken>[];

  @OneToOne(() => UserPreferences, (prefs) => prefs.user, { cascade: true })
  preferences!: Relation<UserPreferences>;
}
