/**
 * T185-T186: Sharing Controller
 *
 * Handles anonymized visit sharing:
 * - POST /visits/:visitId/share - Create share link (authenticated)
 * - GET /shared/:shareId - View shared visit (public, no auth)
 * - DELETE /shared/:shareId - Delete share link (authenticated)
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SharingService } from './sharing.service';
import { CreateShareDto } from './dto/create-share.dto';
import { ApiResponse, SharedVisit } from '@blastoise/shared';

@ApiTags('sharing')
@Controller()
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  /**
   * T185: POST /visits/:visitId/share
   * Create anonymized share link for a visit
   */
  @Post('visits/:visitId/share')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Create share link for a visit',
    description: 'Generates an anonymized share link for a visit. The shared visit displays only venue name and approximate date (rounded to nearest day). No user identity is exposed.',
  })
  @ApiParam({ name: 'visitId', description: 'Visit UUID to share', type: String })
  @ApiBody({ type: CreateShareDto })
  @SwaggerApiResponse({ status: 201, description: 'Share link created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid share parameters' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @SwaggerApiResponse({ status: 404, description: 'Visit not found' })
  async createShare(
    @CurrentUser() user: User,
    @Param('visitId') visitId: string,
    @Body() dto: CreateShareDto
  ): Promise<ApiResponse<{ share_id: string; share_url: string; expires_at?: string }>> {
    const sharedVisit = await this.sharingService.createShare(
      visitId,
      user.id,
      dto
    );

    // Generate full share URL
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4200';
    const shareUrl = `${baseUrl}/shared/${sharedVisit.id}`;

    return {
      success: true,
      data: {
        share_id: sharedVisit.id,
        share_url: shareUrl,
        expires_at: sharedVisit.expires_at,
      },
    };
  }

  /**
   * T186: GET /shared/:shareId
   * View anonymized shared visit (public, no authentication required)
   * Includes T188: Expiration check with 410 Gone response
   */
  @Get('shared/:shareId')
  @Public()
  @ApiOperation({
    summary: 'View shared visit (public)',
    description: 'Retrieves anonymized visit details from a share link. No authentication required. Returns 410 Gone if the share link has expired.',
  })
  @ApiParam({ name: 'shareId', description: 'Share ID from the share link', type: String })
  @SwaggerApiResponse({ status: 200, description: 'Shared visit retrieved successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Share link not found' })
  @SwaggerApiResponse({ status: 410, description: 'Share link has expired' })
  async getShared(
    @Param('shareId') shareId: string
  ): Promise<ApiResponse<SharedVisit>> {
    const sharedVisit = await this.sharingService.getShared(shareId);

    return {
      success: true,
      data: sharedVisit,
    };
  }

  /**
   * Delete share link (revoke access)
   */
  @Delete('shared/:shareId')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Delete share link',
    description: 'Revokes access to a shared visit by deleting the share link.',
  })
  @ApiParam({ name: 'shareId', description: 'Share ID to delete', type: String })
  @SwaggerApiResponse({ status: 204, description: 'Share link deleted successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  @SwaggerApiResponse({ status: 404, description: 'Share link not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShare(
    @CurrentUser() user: User,
    @Param('shareId') shareId: string
  ): Promise<void> {
    await this.sharingService.deleteShare(shareId, user.id);
  }

  /**
   * Get all share links for current user
   */
  @Get('user/shares')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get all user share links',
    description: 'Returns all share links created by the authenticated user.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Share links retrieved successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async getUserShares(
    @CurrentUser() user: User
  ): Promise<ApiResponse<SharedVisit[]>> {
    const shares = await this.sharingService.getUserShares(user.id);

    return {
      success: true,
      data: shares,
    };
  }
}
