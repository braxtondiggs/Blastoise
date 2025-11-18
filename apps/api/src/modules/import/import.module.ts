import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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
import { OverpassApiService } from './services/overpass-api.service';
import { GooglePlacesApiService } from './services/google-places-api.service';
import { NominatimGeocodeService } from './services/nominatim-geocode.service';

@Module({
  imports: [
    ConfigModule,
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
    OverpassApiService,
    GooglePlacesApiService,
    NominatimGeocodeService,
  ],
  exports: [ImportService],
})
export class ImportModule {}
