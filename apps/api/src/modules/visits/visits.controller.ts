import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

interface JwtUser {
  user_id: string;
  email: string;
}
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { BatchVisitSyncDto } from './dto/batch-visit-sync.dto';
import { Visit } from '../../entities/visit.entity';

// API response wrapper (dates serialize to ISO strings automatically)
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  metadata?: Record<string, unknown>;
}

// Server-stored visits are always synced
type VisitResponse = Visit & { synced: true };

function withSynced(visit: Visit): VisitResponse {
  return { ...visit, synced: true };
}

function withSyncedArray(visits: Visit[]): VisitResponse[] {
  return visits.map(withSynced);
}

@ApiTags('visits')
@ApiBearerAuth('JWT')
@Controller('visits')
@UseGuards(RateLimitGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new visit',
    description: 'Records a new venue visit for the authenticated user. Timestamps are automatically rounded to the nearest 15 minutes for privacy.',
  })
  @ApiBody({ type: CreateVisitDto })
  @SwaggerApiResponse({ status: 201, description: 'Visit created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid visit data' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @SwaggerApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() createVisitDto: CreateVisitDto
  ): Promise<ApiResponse<VisitResponse>> {
    const visit = await this.visitsService.create(user.user_id, createVisitDto);
    return {
      success: true,
      data: withSynced(visit),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all visits for the authenticated user',
    description: 'Returns a paginated list of visits ordered by arrival time (most recent first).',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 50, max: 100)' })
  @SwaggerApiResponse({ status: 200, description: 'Visits retrieved successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @SwaggerApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async findAll(
    @CurrentUser() user: JwtUser,
    @Query('page') page = '1',
    @Query('limit') limit = '50'
  ): Promise<ApiResponse<VisitResponse[]>> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const { visits, total } = await this.visitsService.findAll(
      user.user_id,
      pageNum,
      limitNum
    );

    return {
      success: true,
      data: withSyncedArray(visits),
      metadata: {
        timestamp: new Date().toISOString(),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          hasNext: pageNum * limitNum < total,
          hasPrevious: pageNum > 1,
        },
      },
    };
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get the current active visit',
    description: 'Returns the visit that is currently in progress (no departure time) for the authenticated user.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Active visit retrieved (may be null if no active visit)' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async getActive(@CurrentUser() user: JwtUser): Promise<ApiResponse<VisitResponse | undefined>> {
    const visit = await this.visitsService.getActiveVisit(user.user_id);
    return {
      success: true,
      data: visit ? withSynced(visit) : undefined,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific visit by ID',
    description: 'Returns detailed information about a single visit.',
  })
  @ApiParam({ name: 'id', description: 'Visit UUID', type: String })
  @SwaggerApiResponse({ status: 200, description: 'Visit retrieved successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @SwaggerApiResponse({ status: 404, description: 'Visit not found' })
  async findOne(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string
  ): Promise<ApiResponse<VisitResponse>> {
    const visit = await this.visitsService.findOne(id, user.user_id);
    return {
      success: true,
      data: withSynced(visit),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a visit',
    description: 'Updates visit details such as notes or departure time.',
  })
  @ApiParam({ name: 'id', description: 'Visit UUID', type: String })
  @ApiBody({ type: UpdateVisitDto })
  @SwaggerApiResponse({ status: 200, description: 'Visit updated successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid update data' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @SwaggerApiResponse({ status: 404, description: 'Visit not found' })
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() updateVisitDto: UpdateVisitDto
  ): Promise<ApiResponse<VisitResponse>> {
    const visit = await this.visitsService.update(id, user.user_id, updateVisitDto);
    return {
      success: true,
      data: withSynced(visit),
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a visit',
    description: 'Permanently removes a visit from the user\'s history.',
  })
  @ApiParam({ name: 'id', description: 'Visit UUID', type: String })
  @SwaggerApiResponse({ status: 204, description: 'Visit deleted successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @SwaggerApiResponse({ status: 404, description: 'Visit not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string
  ): Promise<void> {
    await this.visitsService.delete(id, user.user_id);
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Batch sync visits',
    description: 'Syncs multiple visits from offline storage. Used by the mobile/web app to sync visits after being offline.',
  })
  @ApiBody({ type: BatchVisitSyncDto })
  @SwaggerApiResponse({ status: 201, description: 'Visits synced successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid batch data' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async batchSync(
    @CurrentUser() user: JwtUser,
    @Body() batchDto: BatchVisitSyncDto
  ): Promise<ApiResponse<VisitResponse[]>> {
    const visits = await this.visitsService.batchSync(user.user_id, batchDto);
    return {
      success: true,
      data: withSyncedArray(visits),
    };
  }
}
