import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './guards/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const result = await this.authService.register(
        registerDto.email,
        registerDto.password
      );

      // Set refresh token in httpOnly cookie
      response.cookie('refreshToken', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return access token and user info
      return {
        access_token: result.access_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        user: result.user,
      };
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message === 'This email is already registered') {
        throw new ConflictException(error.message);
      }
      if (
        error instanceof Error &&
        (error.message.includes('Password must') ||
        error.message.includes('Invalid email'))
      ) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Registration failed');
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password
      );

      // Set refresh token in httpOnly cookie
      response.cookie('refreshToken', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return access token and user info
      return {
        access_token: result.access_token,
        token_type: result.token_type,
        expires_in: result.expires_in,
        user: result.user,
      };
    } catch {
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(@Req() request: Request) {
    const refreshToken = request.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      const result = await this.authService.refreshAccessToken(refreshToken);
      return result;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token. Please log in again.'
      );
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const refreshToken = request.cookies?.refreshToken;

    if (refreshToken) {
      try {
        await this.authService.revokeRefreshToken(refreshToken);
      } catch {
        // Silent failure - token might already be revoked
      }
    }

    // Clear refresh token cookie
    response.clearCookie('refreshToken');

    return { message: 'Successfully logged out' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    // Always return success to prevent email enumeration
    await this.authService.requestPasswordReset(forgotPasswordDto.email);
    return { message: 'If an account exists with this email, a password reset link will be sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    try {
      const result = await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.new_password
      );
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Password reset failed');
    }
  }
}
