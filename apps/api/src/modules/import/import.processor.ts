/**
 * ImportProcessor
 * BullMQ worker for processing large Timeline imports asynchronously
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ImportService } from './import.service';
import { GoogleTimelineData } from '@blastoise/shared';

interface ImportJobData {
  userId: string;
  timelineData: GoogleTimelineData;
  fileName?: string;
}

interface ImportJobProgress {
  processed: number;
  total: number;
  percentage: number;
  message: string;
}

/**
 * Register BullMQ worker for 'import-queue' with concurrency=5
 * Processes import jobs in the background
 */
@Processor('import-queue', {
  concurrency: 5, // Process up to 5 imports simultaneously
})
export class ImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(private readonly importService: ImportService) {
    super();
  }

  /**
   * Process import job with progress updates
   * Wraps ImportService.processImportSync() and reports progress
   */
  async process(job: Job<ImportJobData, any, string>): Promise<any> {
    const { userId, timelineData, fileName } = job.data;

    this.logger.log(
      `Processing import job ${job.id} for user ${userId}, file: ${fileName || 'unnamed'}`
    );

    try {
      // Update progress: Starting
      await job.updateProgress({
        processed: 0,
        total: 100,
        percentage: 0,
        message: 'Starting import...',
      } as ImportJobProgress);

      // Process the import (synchronous processing wrapped in async job)
      const result = await this.importService.processImportSync(
        userId,
        timelineData,
        fileName
      );

      // Update progress: Complete
      await job.updateProgress({
        processed: result.total_places,
        total: result.total_places,
        percentage: 100,
        message: 'Import complete',
      } as ImportJobProgress);

      this.logger.log(
        `Import job ${job.id} completed: ${result.visits_created} visits created, ${result.visits_skipped} skipped`
      );

      return result;
    } catch (error) {
      this.logger.error(`Import job ${job.id} failed: ${error}`);
      throw error;
    }
  }

  /**
   * Event handler: Job completed successfully
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  /**
   * Event handler: Job failed
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`);
  }

  /**
   * Event handler: Job progress updated
   */
  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: ImportJobProgress) {
    this.logger.debug(
      `Job ${job.id} progress: ${progress.percentage}% - ${progress.message}`
    );
  }
}
