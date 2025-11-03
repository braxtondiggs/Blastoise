import { IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class UpdateVisitDto {
  @IsOptional()
  @IsDateString()
  departure_time?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
