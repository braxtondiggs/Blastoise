import { IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class CreateShareDto {
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  include_city?: boolean;
}
