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

    // Calculate expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        parseInt(
          this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d').replace('d', '')
        )
    );

    // Store hashed token in database
    await this.refreshTokenRepository.save({
      token_hash: tokenHash,
      user_id: userId,
      expires_at: expiresAt,
    });

    return token;
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

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
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
    this.validatePasswordStrength(password);

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

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    };
  }

  validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error(
        'Password must be at least 8 characters'
      );
    }

    if (password.length > 128) {
      throw new Error(
        'Password must be less than 128 characters'
      );
    }

    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasLetter || !hasNumber) {
      throw new Error(
        'Password must contain at least one letter and one number'
      );
    }
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

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
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
    this.validatePasswordStrength(newPassword);

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
