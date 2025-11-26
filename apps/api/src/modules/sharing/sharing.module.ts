import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';
import { SharedVisit } from '../../entities/shared-visit.entity';
import { Visit } from '../../entities/visit.entity';
import { Venue } from '../../entities/venue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SharedVisit, Visit, Venue])],
  controllers: [SharingController],
  providers: [SharingService],
  exports: [SharingService],
})
export class SharingModule {}
