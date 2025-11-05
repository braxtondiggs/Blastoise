/**
 * ImportService
 * 
 * Orchestrates the Google Timeline import process
 * Sentry error tracking with sensitive data filtering
 * Pino structured logging with request context
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as Sentry from '@sentry/nestjs';
import { PinoLogger } from 'nestjs-pino';
import { TimelineParserService } from './services/timeline-parser.service';
import { VenueClassifierService } from './services/venue-classifier.service';
import { VisitCreationService } from './services/visit-creation.service';
import { VenueMatchingService } from './services/venue-matching.service';
import { BreweryDbVerifierService } from './services/brewery-db-verifier.service';
import { GoogleSearchVerifierService } from './services/google-search-verifier.service';
import { ImportSummaryDto, ImportErrorDto, TierStatisticsDto } from './dto/import-summary.dto';
import { PlaceVisit, GoogleTimelineData, ImportHistory } from '@blastoise/shared';
import { ImportHistoryRepository } from '@blastoise/data-backend';

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ASYNC_THRESHOLD_PLACES = 100;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  private readonly importHistoryRepo: ImportHistoryRepository;

  constructor(
    private readonly pinoLogger: PinoLogger,
    private readonly timelineParser: TimelineParserService,
    private readonly venueClassifier: VenueClassifierService,
    private readonly visitCreation: VisitCreationService,
    private readonly venueMatching: VenueMatchingService,
    private readonly breweryDbVerifier: BreweryDbVerifierService,
    private readonly googleSearchVerifier: GoogleSearchVerifierService,
    @InjectQueue('import-queue') private readonly importQueue: Queue
  ) {
    this.importHistoryRepo = new ImportHistoryRepository();
    this.pinoLogger.setContext(ImportService.name);
  }

  /**
   * Filter sensitive data from Sentry context
   * Removes GPS coordinates, addresses, user IDs from error reporting
   */
  private filterSensitiveData(data: any): any {
    if (!data) return data;

    const filtered = { ...data };

    // Remove sensitive fields
    delete filtered.latitude;
    delete filtered.longitude;
    delete filtered.address;
    delete filtered.user_id;
    delete filtered.userId;
    delete filtered.timelineData; // Don't send raw Timeline JSON to Sentry

    // Redact place names (keep first 3 chars)
    if (filtered.place_name && typeof filtered.place_name === 'string') {
      filtered.place_name = filtered.place_name.substring(0, 3) + '***';
    }

    return filtered;
  }

  async processImportSync(
    userId: string,
    timelineData: unknown,
    fileName?: string,
    requestId?: string
  ): Promise<ImportSummaryDto> {
    const startTime = Date.now();
    const errors: ImportErrorDto[] = [];
    const tierStats: TierStatisticsDto = {
      tier1_matches: 0,
      tier2_matches: 0,
      tier3_matches: 0,
      unverified: 0,
    };

    let visits_created = 0;
    let visits_skipped = 0;
    let new_venues_created = 0;
    let existing_venues_matched = 0;


    // Create child logger with import context
    const contextLogger = this.pinoLogger.logger.child({
      requestId,
      userId,
      fileName,
      stage: 'processImportSync',
    });

    // Set Sentry context (filtered)
    Sentry.setContext('import', this.filterSensitiveData({
      fileName,
    }));

    contextLogger.info({
      fileName,
      stage: 'start',
    }, 'Starting import process');

    try {
      this.validateImportData(timelineData, fileName);
      contextLogger.debug('File validation passed');

      const placeVisits: PlaceVisit[] = this.timelineParser.extractPlaceVisits(
        timelineData as GoogleTimelineData
      );

      contextLogger.info({
        total_places: placeVisits.length,
        stage: 'parse_complete',
      }, 'Parsed Timeline data');

      this.logger.log(`Parsed ${placeVisits.length} place visits from Timeline data`);

      // Process each place visit
      for (const placeVisit of placeVisits) {
        try {
          // Tier 1: Classify as brewery/winery using keywords
          const classification = this.venueClassifier.classify(
            placeVisit.name,
            placeVisit.address
          );

          let finalVenueType: 'brewery' | 'winery' | null = classification.venue_type;
          let verificationTier: 1 | 2 | 3 = 1;

          // Try Tier 2/3 for low confidence or failed Tier 1
          if (!classification.is_brewery_or_winery || !classification.venue_type || classification.confidence < 0.7) {
            // Tier 1 uncertain - try Tier 2 (Open Brewery DB)
            if (placeVisit.latitude && placeVisit.longitude) {
              const tier2Result = await this.breweryDbVerifier.searchNearby(
                placeVisit.name,
                placeVisit.latitude,
                placeVisit.longitude
              );

              if (tier2Result.verified && tier2Result.venue_type) {
                finalVenueType = tier2Result.venue_type;
                verificationTier = 2;
                tierStats.tier2_matches++;
                this.logger.log(`Tier 2 verified: ${placeVisit.name} (${tier2Result.confidence.toFixed(2)} confidence)`);
              } else {
                // Tier 2 failed - try Tier 3 (Google Search)
                const tier3Result = await this.googleSearchVerifier.verifyVenue(
                  placeVisit.name,
                  placeVisit.address
                );

                if (tier3Result.verified && tier3Result.venue_type) {
                  finalVenueType = tier3Result.venue_type;
                  verificationTier = 3;
                  tierStats.tier3_matches++;
                  this.logger.log(`Tier 3 verified: ${placeVisit.name} via Google Search (keywords: ${tier3Result.keywords_found?.join(', ')})`);
                } else {
                  // All tiers failed
                  visits_skipped++;
                  tierStats.unverified++;
                  this.logger.debug(`All tiers failed for: ${placeVisit.name}`);
                  continue;
                }
              }
            } else {
              // No coordinates - can't use Tier 2, try Tier 3
              const tier3Result = await this.googleSearchVerifier.verifyVenue(
                placeVisit.name,
                placeVisit.address
              );

              if (tier3Result.verified && tier3Result.venue_type) {
                finalVenueType = tier3Result.venue_type;
                verificationTier = 3;
                tierStats.tier3_matches++;
                this.logger.log(`Tier 3 verified: ${placeVisit.name} (no coordinates)`);
              } else {
                // All tiers failed
                visits_skipped++;
                tierStats.unverified++;
                errors.push({
                  place_name: placeVisit.name,
                  address: placeVisit.address,
                  timestamp: placeVisit.arrival_time,
                  error: 'Could not verify as brewery or winery (all tiers failed)',
                  error_code: 'VERIFICATION_FAILED',
                });
                continue;
              }
            }
          } else {
            // Tier 1 succeeded with high confidence
            tierStats.tier1_matches++;
          }

          if (!finalVenueType) {
            // Should not reach here, but safety check
            visits_skipped++;
            tierStats.unverified++;
            continue;
          }

          // Find or create venue using intelligent matching
          // Strategy: Place ID → Proximity + Fuzzy Name → Create New
          const matchResult = await this.venueMatching.findOrCreateVenue(
            placeVisit,
            finalVenueType,
            verificationTier // Pass actual verification tier used (1, 2, or 3)
          );

          if (!matchResult.venue) {
            visits_skipped++;
            errors.push({
              place_name: placeVisit.name,
              address: placeVisit.address,
              timestamp: placeVisit.arrival_time,
              error: 'Failed to create venue',
              error_code: 'VENUE_CREATION_FAILED',
            });
            continue;
          }

          const venue = matchResult.venue;

          // Track venue matching statistics
          if (matchResult.matched) {
            existing_venues_matched++;
            this.logger.debug(
              `Matched existing venue: ${venue.name} (${matchResult.matchType}, confidence: ${matchResult.confidence?.toFixed(2)})`
            );
          } else {
            new_venues_created++;
          }

          // Check for duplicate visit
          const isDuplicate = await this.visitCreation.detectDuplicateVisit(
            userId,
            venue.id,
            placeVisit.arrival_time
          );

          if (isDuplicate) {
            visits_skipped++;
            this.logger.debug(`Skipped duplicate visit: ${placeVisit.name} at ${placeVisit.arrival_time}`);
            continue;
          }

          // Create visit
          await this.visitCreation.createImportedVisit(
            userId,
            venue.id,
            placeVisit.arrival_time,
            placeVisit.departure_time
          );

          visits_created++;
        } catch (error) {
          // Capture error in Sentry with filtered context
          Sentry.captureException(error, {
            contexts: {
              place_visit: this.filterSensitiveData({
                place_name: placeVisit.name,
                address: placeVisit.address,
                timestamp: placeVisit.arrival_time,
              }),
            },
            tags: {
              import_stage: 'visit_creation',
            },
          });

          // Log error but continue processing other visits
          this.logger.error(`Error processing place visit "${placeVisit.name}": ${error}`);
          visits_skipped++;
          errors.push({
            place_name: placeVisit.name,
            address: placeVisit.address,
            timestamp: placeVisit.arrival_time,
            error: error instanceof Error ? error.message : 'Unknown error',
            error_code: 'VISIT_CREATION_FAILED',
          });
        }
      }

      const processingTime = Date.now() - startTime;

      // Record import history
      await this.recordImportHistory(
        userId,
        fileName,
        placeVisits.length,
        visits_created,
        visits_skipped,
        new_venues_created,
        processingTime,
        errors,
        tierStats,
        existing_venues_matched
      );


      contextLogger.info({
        total_places: placeVisits.length,
        visits_created,
        visits_skipped,
        new_venues_created,
        existing_venues_matched,
        processing_time_ms: processingTime,
        error_count: errors.length,
        tier1_matches: tierStats.tier1_matches,
        tier2_matches: tierStats.tier2_matches,
        tier3_matches: tierStats.tier3_matches,
        unverified: tierStats.unverified,
        stage: 'complete',
      }, 'Import completed successfully');

      // Return summary
      return new ImportSummaryDto({
        success: true,
        total_places: placeVisits.length,
        visits_created,
        visits_skipped,
        new_venues_created,
        existing_venues_matched, //
        processing_time_ms: processingTime,
        errors,
        tier_statistics: tierStats,
      });
    } catch (error) {

      contextLogger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        stage: 'critical_failure',
      }, 'Import failed with critical error');

      Sentry.captureException(error, {
        contexts: {
          import: this.filterSensitiveData({
            fileName,
            stage: 'processImportSync',
          }),
        },
        tags: {
          import_stage: 'critical_failure',
        },
      });


      this.logger.error(`Import failed: ${error}`);

      const processingTime = Date.now() - startTime;

      return new ImportSummaryDto({
        success: false,
        total_places: 0,
        visits_created,
        visits_skipped,
        new_venues_created,
        existing_venues_matched: 0,
        processing_time_ms: processingTime,
        errors: [
          {
            place_name: 'N/A',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Import failed',
          },
        ],
      });
    }
  }

  /**

   */
  private validateImportData(timelineData: unknown, fileName?: string): void {
    // Validate JSON structure
    if (!timelineData || typeof timelineData !== 'object') {
      throw new BadRequestException('Invalid Timeline data: must be a JSON object');
    }

    // Validate file size (approximate check)
    const dataSize = JSON.stringify(timelineData).length;
    if (dataSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large: ${(dataSize / (1024 * 1024)).toFixed(2)}MB (max ${MAX_FILE_SIZE_MB}MB)`
      );
    }

    this.logger.debug(`Validated Timeline data: ${(dataSize / 1024).toFixed(2)}KB`);
  }



  /**

   */
  private async recordImportHistory(
    userId: string,
    fileName: string | undefined,
    totalPlaces: number,
    visitsCreated: number,
    visitsSkipped: number,
    newVenuesCreated: number,
    processingTimeMs: number,
    errors: ImportErrorDto[],
    tierStats: TierStatisticsDto,
    existingVenuesMatched?: number,
    jobId?: string
  ): Promise<void> {
    try {

      await this.importHistoryRepo.create({
        user_id: userId,
        source: 'google_timeline',
        file_name: fileName,
        job_id: jobId,
        total_places: totalPlaces,
        visits_created: visitsCreated,
        visits_skipped: visitsSkipped,
        new_venues_created: newVenuesCreated,
        existing_venues_matched: existingVenuesMatched,
        processing_time_ms: processingTimeMs,
        metadata: {
          errors: errors.map((e) => ({
            place_name: e.place_name,
            address: e.address,
            timestamp: e.timestamp,
            error: e.error,
            error_code: e.error_code,
          })),
          tier_statistics: {
            tier1_matches: tierStats.tier1_matches,
            tier2_matches: tierStats.tier2_matches,
            tier3_matches: tierStats.tier3_matches,
            unverified: tierStats.unverified,
          },
        },
      });

      this.logger.log(
        `Recorded import history: user=${userId}, file=${fileName}, total=${totalPlaces}, created=${visitsCreated}`
      );
    } catch (error) {
      this.logger.error(`Failed to record import history: ${error}`);
      // Don't fail the import if history recording fails
    }
  }

  /**

   * Note: For JSON string uploads, no file cleanup needed
   * This will be used when multipart file upload is implemented
   */
  async cleanupUploadedFile(filePath: string): Promise<void> {
    try {
      // TODO: Implement file deletion for multipart uploads
      // import { unlink } from 'fs/promises';
      // await unlink(filePath);
      this.logger.debug(`File cleanup: ${filePath}`);
    } catch (error) {
      this.logger.warn(`Failed to delete uploaded file ${filePath}: ${error}`);
    }
  }

  /**

   * Returns job ID for status polling


   */
  async queueImportJob(
    userId: string,
    timelineData: GoogleTimelineData,
    fileName?: string,
    requestId?: string
  ): Promise<string> {
    const contextLogger = this.pinoLogger.logger.child({
      requestId,
      userId,
      fileName,
      stage: 'queueImportJob',
    });

    try {
      const job = await this.importQueue.add(
        'process-import',
        {
          userId,
          timelineData,
          fileName,
        },
        {
          jobId: `import-${userId}-${Date.now()}`, // Unique job ID
          removeOnComplete: false, // Keep for history
          removeOnFail: false, // Keep for debugging
        }
      );

      contextLogger.info({
        jobId: job.id,
        stage: 'queue_success',
      }, 'Import job queued successfully');

      this.logger.log(`Queued import job ${job.id} for user ${userId}`);
      return job.id!;
    } catch (error) {
      contextLogger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        stage: 'queue_failure',
      }, 'Failed to queue import job');


      Sentry.captureException(error, {
        contexts: {
          import: this.filterSensitiveData({
            fileName,
            stage: 'queueImportJob',
          }),
        },
        tags: {
          import_stage: 'job_queue',
        },
      });

      this.logger.error(`Failed to queue import job: ${error}`);
      throw error;
    }
  }

  /**

   * Returns job state, progress, and result if complete
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress?: any;
    result?: ImportSummaryDto;
    error?: string;
  }> {
    const job = await this.importQueue.getJob(jobId);

    if (!job) {
      throw new BadRequestException(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress;

    let result: ImportSummaryDto | undefined;
    let error: string | undefined;

    if (state === 'completed') {
      result = job.returnvalue as ImportSummaryDto;
    } else if (state === 'failed') {
      error = job.failedReason || 'Unknown error';
    }

    return {
      status: state,
      progress,
      result,
      error,
    };
  }

  /**

   * Returns true if >100 places
   */
  shouldProcessAsync(timelineData: GoogleTimelineData): boolean {
    try {
      const placeVisits = this.timelineParser.extractPlaceVisits(timelineData);
      return placeVisits.length > ASYNC_THRESHOLD_PLACES;
    } catch (error) {
      this.logger.error(`Error detecting place count: ${error}`);
      return false; // Default to sync if can't determine
    }
  }

  /**

   * Returns list ordered by imported_at DESC

   */
  async getImportHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<ImportHistory[]> {
    try {
      return await this.importHistoryRepo.findByUserId(userId, limit, offset);
    } catch (error) {

      Sentry.captureException(error, {
        contexts: {
          import: this.filterSensitiveData({
            limit,
            offset,
            stage: 'getImportHistory',
          }),
        },
        tags: {
          import_stage: 'history_fetch',
        },
      });

      this.logger.error(`Failed to fetch import history for user ${userId}: ${error}`);
      throw new BadRequestException('Failed to fetch import history');
    }
  }

  /**


   */
  async getImportHistoryCount(userId: string): Promise<number> {
    try {
      return await this.importHistoryRepo.countByUserId(userId);
    } catch (error) {

      Sentry.captureException(error, {
        contexts: {
          import: this.filterSensitiveData({
            stage: 'getImportHistoryCount',
          }),
        },
        tags: {
          import_stage: 'history_count',
        },
      });

      this.logger.error(`Failed to count import history for user ${userId}: ${error}`);
      throw new BadRequestException('Failed to count import history');
    }
  }
}
