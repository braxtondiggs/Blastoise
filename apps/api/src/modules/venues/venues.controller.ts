import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { VenuesService, VenueWithDistance } from './venues.service';
import { SearchVenuesDto } from './dto/search-venues.dto';
import { NearbyVenuesDto } from './dto/nearby-venues.dto';
import { ApiResponse, Venue } from '@blastoise/shared';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  /**
   * T161: Search venues by text query
   */
  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Search venues by text query',
    description: 'Search for breweries and wineries by name, city, or region. Results are paginated and cached for 2 minutes.',
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query (venue name, city, or region)' })
  @ApiQuery({ name: 'type', required: false, enum: ['brewery', 'winery'], description: 'Filter by venue type' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (default: 50, max: 100)' })
  @SwaggerApiResponse({ status: 200, description: 'Venues retrieved successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid search parameters' })
  async search(@Query() dto: SearchVenuesDto): Promise<ApiResponse<Venue[]>> {
    const { venues, total } = await this.venuesService.search(dto);

    return {
      success: true,
      data: venues,
      metadata: {
        timestamp: new Date().toISOString(),
        pagination: {
          page: parseInt(dto.page || '1', 10),
          limit: parseInt(dto.limit || '50', 10),
          total,
          hasNext: parseInt(dto.page || '1', 10) * parseInt(dto.limit || '50', 10) < total,
          hasPrevious: parseInt(dto.page || '1', 10) > 1,
        },
      },
    };
  }

  /**
   * T157: Find nearby venues with distance
   */
  @Get('nearby')
  @Public()
  @ApiOperation({
    summary: 'Find nearby venues',
    description: 'Discover breweries and wineries near a given location using Redis geospatial indexing. Results include distance in kilometers and are cached for 1 minute.',
  })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude (-90 to 90)' })
  @ApiQuery({ name: 'lng', required: true, type: Number, description: 'Longitude (-180 to 180)' })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Search radius in kilometers (default: 5, max: 100)' })
  @ApiQuery({ name: 'type', required: false, enum: ['brewery', 'winery'], description: 'Filter by venue type' })
  @SwaggerApiResponse({ status: 200, description: 'Nearby venues retrieved successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid coordinates or radius' })
  async nearby(@Query() dto: NearbyVenuesDto): Promise<ApiResponse<VenueWithDistance[]>> {
    const venues = await this.venuesService.findNearby(dto);

    return {
      success: true,
      data: venues,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get venue by ID',
    description: 'Returns detailed information about a specific venue. Results are cached for 5 minutes.',
  })
  @ApiParam({ name: 'id', description: 'Venue UUID', type: String })
  @SwaggerApiResponse({ status: 200, description: 'Venue retrieved successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Venue not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponse<Venue>> {
    const venue = await this.venuesService.findById(id);

    return {
      success: true,
      data: venue,
    };
  }
}
