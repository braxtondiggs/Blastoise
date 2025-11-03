import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVisitDto } from './create-visit.dto';

export class BatchVisitSyncDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVisitDto)
  visits!: CreateVisitDto[];
}
