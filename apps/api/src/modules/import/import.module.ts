import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportProcessor } from './import.processor';
import { TimelineParserService } from './services/timeline-parser.service';
import { VenueClassifierService } from './services/venue-classifier.service';
import { VisitCreationService } from './services/visit-creation.service';
import { VenueMatchingService } from './services/venue-matching.service';
import { BreweryDbVerifierService } from './services/brewery-db-verifier.service';
import { GoogleSearchVerifierService } from './services/google-search-verifier.service';
import { VerificationCacheService } from './services/verification-cache.service';
import { OsmDiscoveryService } from './services/osm-discovery.service';
import { Visit } from '../../entities/visit.entity';
import { Venue } from '../../entities/venue.entity';
import { ImportHistory } from '../../entities/import-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visit, Venue, ImportHistory]),
    BullModule.registerQueue({
      name: 'import-queue',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: false, // Keep completed jobs for history
        removeOnFail: false, // Keep failed jobs for debugging
      },
    }),
  ],
  controllers: [ImportController],
  providers: [
    ImportService,
    ImportProcessor,
    TimelineParserService,
    VenueClassifierService,
    VisitCreationService,
    VenueMatchingService,
    BreweryDbVerifierService,
    GoogleSearchVerifierService,
    VerificationCacheService,
    OsmDiscoveryService,
  ],
  exports: [
    ImportService,
    VerificationCacheService,
    BreweryDbVerifierService,
    OsmDiscoveryService,
  ],
})
export class ImportModule {}
