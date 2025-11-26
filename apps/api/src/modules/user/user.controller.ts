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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserService } from './user.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

interface JwtUser {
  user_id: string;
  email: string;
}

@ApiTags('user')
@ApiBearerAuth('JWT')
@Controller('user')
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
  async getPreferences(@CurrentUser() user: JwtUser) {
    const preferences = await this.userService.getPreferences(user.user_id);

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
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdatePreferencesDto
  ) {
    const updated = await this.userService.updatePreferences(user.user_id, dto);

    return {
      success: true,
      data: updated,
    };
  }
}
