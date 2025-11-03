import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';

export class CreateVisitDto {
  @IsString()
  venue_id!: string;

  @IsDateString()
  arrival_time!: string;

  @IsOptional()
  @IsDateString()
  departure_time?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsEnum(['auto', 'manual'])
  @IsOptional()
  detection_method?: 'auto' | 'manual';
}
