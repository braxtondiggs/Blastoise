import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { Venue } from '../../entities/venue.entity';
import { ImportModule } from '../import/import.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue]),
    ImportModule,
  ],
  controllers: [VenuesController],
  providers: [VenuesService],
  exports: [VenuesService],
})
export class VenuesModule {}
