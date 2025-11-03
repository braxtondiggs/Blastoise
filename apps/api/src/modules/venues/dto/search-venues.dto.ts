import { IsOptional, IsString, IsEnum } from 'class-validator';

export class SearchVenuesDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(['brewery', 'winery'])
  type?: 'brewery' | 'winery';

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
