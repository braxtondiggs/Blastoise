/**
 * ImportController
 * Handles Google Timeline import endpoints
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
  HttpStatus,
  HttpException,
  Header,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ImportService } from './import.service';
import { GoogleTimelineImportDto } from './dto/google-timeline-import.dto';
import { ImportSummaryDto } from './dto/import-summary.dto';
import { GoogleTimelineData, ImportHistory } from '@blastoise/shared';

@Controller('import')
@UseGuards(AuthGuard)
export class ImportController {
  private readonly logger = new Logger(ImportController.name);

  constructor(private readonly importService: ImportService) {}

  /**
   * POST /api/v1/import/google-timeline
   * Detects file size and routes to sync or async processing
   *
   * Returns:
   * - Small files (<100 places): ImportSummaryDto (immediate)
   * - Large files (≥100 places): { job_id: string } (async)
   *
   * Rate limited to 5 imports/day per user (handled in guard/interceptor)
   */
  @Post('google-timeline')
  async importGoogleTimeline(
    @Request() req: { user?: { id?: string; sub?: string } },
    @Body() dto: GoogleTimelineImportDto
  ): Promise<ImportSummaryDto | { job_id: string }> {
    const userId = req.user?.id || req.user?.sub; // JWT payload userId

    if (!userId) {
      throw new HttpException(
        'User ID not found in request',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(
      `Processing Google Timeline import for user ${userId}, file: ${dto.file_name || 'unnamed'}`
    );

    try {
      // Parse and validate JSON data
      let timelineData: GoogleTimelineData;
      try {
        timelineData = JSON.parse(dto.timeline_data) as GoogleTimelineData;
      } catch {
        throw new HttpException(
          'Invalid JSON format',
          HttpStatus.BAD_REQUEST
        );
      }

      // Detect if import should be async based on place count
      const shouldAsync = this.importService.shouldProcessAsync(timelineData);

      if (shouldAsync) {
        // Large file: Queue for async processing (T075)
        const jobId = await this.importService.queueImportJob(
          userId,
          timelineData,
          dto.file_name
        );

        this.logger.log(
          `Queued async import job ${jobId} for user ${userId} (large file)`
        );

        return { job_id: jobId };
      } else {
        // Small file: Process synchronously
        const summary = await this.importService.processImportSync(
          userId,
          timelineData,
          dto.file_name
        );

        this.logger.log(
          `Import complete for user ${userId}: ${summary.visits_created} visits created, ${summary.visits_skipped} skipped`
        );

        return summary;
      }
    } catch (error) {
      this.logger.error(`Import failed for user ${userId}: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Import processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/import/status/:jobId
   * Returns job status and progress for async imports
   *
   * Response:
   * - status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
   * - progress: { processed: number, total: number, percentage: number, message: string }
   * - result: ImportSummaryDto (if completed)
   * - error: string (if failed)
   *
   * Cache-Control header set to max-age=5 (5 seconds)
   */
  @Get('status/:jobId')
  @Header('Cache-Control', 'max-age=5, must-revalidate')
  async getImportStatus(
    @Request() req: { user?: { id?: string; sub?: string } },
    @Param('jobId') jobId: string
     
  ): Promise<{
    status: string;
    progress?: any;
    result?: ImportSummaryDto;
    error?: string;
  }> {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new HttpException(
        'User ID not found in request',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.debug(
      `Fetching import job status for ${jobId} (user ${userId})`
    );

    try {
      const status = await this.importService.getJobStatus(jobId);

      // TODO: Add authorization check - ensure jobId belongs to userId
      // For now, any authenticated user can check any job status

      return status;
    } catch (error) {
      this.logger.error(`Failed to fetch job status ${jobId}: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to fetch job status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/v1/import/history
   * Returns import history for the authenticated user
   *
   * Query params:
   * - limit: number (default 50, max 100)
   * - offset: number (default 0)
   */
  @Get('history')
  async getImportHistory(
    @Request() req: { user?: { id?: string; sub?: string } },
    @Param('limit') limit?: string,
    @Param('offset') offset?: string
  ): Promise<{ imports: ImportHistory[]; total: number }> {
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      throw new HttpException(
        'User ID not found in request',
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.debug(`Fetching import history for user ${userId}`);

    try {
      // Parse query params
      const parsedLimit = Math.min(parseInt(limit || '50'), 100);
      const parsedOffset = parseInt(offset || '0');

      // Get import history from service
      const imports = await this.importService.getImportHistory(
        userId,
        parsedLimit,
        parsedOffset
      );

      // Get total count for pagination
      const total = await this.importService.getImportHistoryCount(userId);

      return {
        imports,
        total,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch import history: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to fetch import history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
