import { IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbyVenuesDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  @IsOptional()
  radius?: number; // in kilometers, default 5km

  @IsOptional()
  @IsEnum(['brewery', 'winery'])
  type?: 'brewery' | 'winery';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
