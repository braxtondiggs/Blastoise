import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current user from the JWT token payload
 *
 * Usage:
 * @Get('profile')
 * getProfile(@CurrentUser() user: { user_id: string; email: string }) {
 *   return user;
 * }
 *
 * The user object contains:
 * - user_id: UUID of the authenticated user
 * - email: Email address of the authenticated user
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
