import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { UserService } from '../modules/user/user.service';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private emailService: EmailService
  ) {}

  // Password hashing helpers
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(
    plaintext: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  // Token generation
  generateAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ user_id: userId, email });
  }

  async generateRefreshToken(userId: string): Promise<string> {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Calculate expiration from config (supports: 7d, 24h, 60m, 3600s)
    const expiresAt = new Date();
    const expiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '180d');
    const ms = this.parseDuration(expiration);
    expiresAt.setTime(expiresAt.getTime() + ms);

    // Store hashed token in database
    await this.refreshTokenRepository.save({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
    });

    return token;
  }

  /**
   * Parse duration string to milliseconds
   * Supports: 7d (days), 24h (hours), 60m (minutes), 3600s (seconds)
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([dhms])$/);
    if (!match) {
      // Default to 7 days if format is invalid
      return 7 * 24 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      case 's':
        return value * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  // Login
  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await this.comparePasswords(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Calculate expires_in from config
    const accessExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '90d');
    const expiresInMs = this.parseDuration(accessExpiration);
    const expiresInSeconds = Math.floor(expiresInMs / 1000);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    };
  }

  // Registration
  async register(email: string, password: string) {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('This email is already registered');
    }

    // Validate password strength
    const validation = this.validatePasswordStrength(password);
    if (!validation.valid) {
      throw new Error(validation.errors.join('. '));
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await this.userRepository.save({
      email: email.toLowerCase(),
      password_hash: passwordHash,
    });

    // Create default user preferences
    await this.userService.createDefaultPreferences(user.id);

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.generateRefreshToken(user.id);

    // Calculate expires_in from config
    const accessExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '90d');
    const expiresInMs = this.parseDuration(accessExpiration);
    const expiresInSeconds = Math.floor(expiresInMs / 1000);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    };
  }

  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    if (!/[a-zA-Z]/.test(password)) {
      errors.push('Password must contain at least one letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return { valid: errors.length === 0, errors };
  }

  // Token refresh
  async validateRefreshToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token_hash: tokenHash },
    });

    if (!refreshToken) {
      return null;
    }

    // Check if token is expired
    if (refreshToken.expires_at < new Date()) {
      return null;
    }

    // Check if token is revoked
    if (refreshToken.revoked_at) {
      return null;
    }

    return refreshToken;
  }

  async refreshAccessToken(token: string) {
    const refreshToken = await this.validateRefreshToken(token);

    if (!refreshToken) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findOne({
      where: { id: refreshToken.user_id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);

    // Generate new refresh token (token rotation for security)
    const newRefreshToken = await this.generateRefreshToken(user.id);

    // Revoke the old refresh token
    await this.revokeRefreshToken(token);

    // Calculate expires_in from config
    const accessExpiration = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '90d');
    const expiresInMs = this.parseDuration(accessExpiration);
    const expiresInSeconds = Math.floor(expiresInMs / 1000);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer' as const,
      expires_in: expiresInSeconds,
    };
  }

  // Logout (revoke refresh token)
  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.refreshTokenRepository.update(
      { token_hash: tokenHash },
      { revoked_at: new Date() }
    );
  }

  // Password Reset - Request
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists with this email, a password reset link will be sent.' };
    }

    // Invalidate any existing reset tokens for this user
    await this.passwordResetTokenRepository.update(
      { user_id: user.id, used: false },
      { used: true }
    );

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store hashed token
    await this.passwordResetTokenRepository.save({
      token_hash: tokenHash,
      user_id: user.id,
      expires_at: expiresAt,
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, token);

    return { message: 'If an account exists with this email, a password reset link will be sent.' };
  }

  // Password Reset - Execute
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token_hash: tokenHash },
    });

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    // Check if token is expired
    if (resetToken.expires_at < new Date()) {
      throw new Error('Reset token has expired. Please request a new one.');
    }

    // Check if token was already used
    if (resetToken.used) {
      throw new Error('This reset token has already been used');
    }

    // Validate new password
    const validation = this.validatePasswordStrength(newPassword);
    if (!validation.valid) {
      throw new Error(validation.errors.join('. '));
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update user's password
    await this.userRepository.update(
      { id: resetToken.user_id },
      { password_hash: passwordHash }
    );

    // Mark token as used
    await this.passwordResetTokenRepository.update(
      { id: resetToken.id },
      { used: true }
    );

    // Revoke all refresh tokens for this user (force re-login)
    await this.refreshTokenRepository.update(
      { user_id: resetToken.user_id, revoked_at: null as any },
      { revoked_at: new Date() }
    );

    return { message: 'Password has been reset successfully' };
  }
}
