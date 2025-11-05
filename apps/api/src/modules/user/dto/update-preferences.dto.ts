/**
 * Update Preferences DTO
 *
 * Validates user preference updates
 */

import {
  IsBoolean,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  visitDetected?: boolean;

  @IsOptional()
  @IsBoolean()
  visitEnded?: boolean;

  @IsOptional()
  @IsBoolean()
  newNearbyVenues?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @IsOptional()
  @IsBoolean()
  sharingActivity?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  locationTrackingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  backgroundTrackingEnabled?: boolean;

  @IsOptional()
  @IsEnum(['never', 'ask', 'always'])
  sharingPreference?: 'never' | 'ask' | 'always';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  dataRetentionMonths?: number | null;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}
