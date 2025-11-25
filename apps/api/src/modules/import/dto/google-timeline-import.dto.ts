/**
 * DTO for importing Google Timeline JSON data
 */

import { IsNotEmpty, IsJSON, IsOptional, IsString, MaxLength } from 'class-validator';

export class GoogleTimelineImportDto {
  @IsNotEmpty()
  @IsJSON()
  timeline_data!: string; // JSON string of Timeline data (will be parsed)

  @IsOptional()
  @IsString()
  @MaxLength(255)
  file_name?: string; // Original filename for tracking
}