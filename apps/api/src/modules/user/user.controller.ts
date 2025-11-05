/**
 * User Controller
 *
 * Endpoints for user preferences management:
 * - GET /user/preferences: Get current preferences
 * - PATCH /user/preferences: Update preferences
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('user')
@ApiBearerAuth('JWT')
@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /user/preferences
   * Returns current user preferences
   */
  @Get('preferences')
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Returns privacy settings, notification preferences, and other user-configurable options.',
  })
  @SwaggerApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async getPreferences(@Request() req: any) {
    const userId = req.user.sub;
    const preferences = await this.userService.getPreferences(userId);

    return {
      success: true,
      data: preferences,
    };
  }

  /**
   * PATCH /user/preferences
   * Updates user preferences
   */
  @Patch('preferences')
  @ApiOperation({
    summary: 'Update user preferences',
    description: 'Updates privacy settings, notification preferences, and other user-configurable options. Only provided fields will be updated.',
  })
  @ApiBody({ type: UpdatePreferencesDto })
  @SwaggerApiResponse({ status: 200, description: 'Preferences updated successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid preference data' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto
  ) {
    const userId = req.user.sub;
    const updated = await this.userService.updatePreferences(userId, dto);

    return {
      success: true,
      data: updated,
    };
  }
}
