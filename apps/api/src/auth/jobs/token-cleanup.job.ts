/**
 * Token Cleanup Job
 *
 * Scheduled job that removes expired tokens from the database:
 * - Refresh tokens expired more than 30 days ago
 * - Password reset tokens expired more than 7 days ago
 *
 * Schedule: Daily at 2:00 AM UTC
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';

@Injectable()
export class TokenCleanupJob {
  private readonly logger = new Logger(TokenCleanupJob.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>
  ) {}

  /**
   * Clean up expired refresh tokens
   * Runs daily at 2:00 AM UTC
   * Removes tokens expired more than 30 days ago
   */
  @Cron('0 2 * * *', {
    name: 'cleanup-refresh-tokens',
    timeZone: 'UTC',
  })
  async cleanupRefreshTokens(): Promise<void> {
    this.logger.log('Starting refresh token cleanup...');

    try {
      // Calculate cutoff date (30 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const result = await this.refreshTokenRepository.delete({
        expires_at: LessThan(cutoffDate),
      });

      this.logger.log(
        `Refresh token cleanup complete. Deleted ${result.affected || 0} expired tokens.`
      );
    } catch (error) {
      this.logger.error('Failed to cleanup refresh tokens:', error);
    }
  }

  /**
   * Clean up expired password reset tokens
   * Runs daily at 2:15 AM UTC (offset to avoid concurrent load)
   * Removes tokens expired more than 7 days ago
   */
  @Cron('15 2 * * *', {
    name: 'cleanup-password-reset-tokens',
    timeZone: 'UTC',
  })
  async cleanupPasswordResetTokens(): Promise<void> {
    this.logger.log('Starting password reset token cleanup...');

    try {
      // Calculate cutoff date (7 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const result = await this.passwordResetTokenRepository.delete({
        expires_at: LessThan(cutoffDate),
      });

      this.logger.log(
        `Password reset token cleanup complete. Deleted ${result.affected || 0} expired tokens.`
      );
    } catch (error) {
      this.logger.error('Failed to cleanup password reset tokens:', error);
    }
  }

  /**
   * Clean up revoked refresh tokens
   * Runs daily at 2:30 AM UTC
   * Removes tokens that were revoked more than 7 days ago
   */
  @Cron('30 2 * * *', {
    name: 'cleanup-revoked-tokens',
    timeZone: 'UTC',
  })
  async cleanupRevokedTokens(): Promise<void> {
    this.logger.log('Starting revoked token cleanup...');

    try {
      // Calculate cutoff date (7 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      const result = await this.refreshTokenRepository
        .createQueryBuilder()
        .delete()
        .where('revoked_at IS NOT NULL')
        .andWhere('revoked_at < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(
        `Revoked token cleanup complete. Deleted ${result.affected || 0} revoked tokens.`
      );
    } catch (error) {
      this.logger.error('Failed to cleanup revoked tokens:', error);
    }
  }

  /**
   * Manual trigger for all cleanup jobs (useful for testing/admin)
   */
  async runAllCleanups(): Promise<{
    refreshTokens: number;
    passwordResetTokens: number;
    revokedTokens: number;
  }> {
    this.logger.log('Running all token cleanup jobs manually...');

    const results = {
      refreshTokens: 0,
      passwordResetTokens: 0,
      revokedTokens: 0,
    };

    // Refresh tokens (30 days)
    const refreshCutoff = new Date();
    refreshCutoff.setDate(refreshCutoff.getDate() - 30);
    const refreshResult = await this.refreshTokenRepository.delete({
      expires_at: LessThan(refreshCutoff),
    });
    results.refreshTokens = refreshResult.affected || 0;

    // Password reset tokens (7 days)
    const resetCutoff = new Date();
    resetCutoff.setDate(resetCutoff.getDate() - 7);
    const resetResult = await this.passwordResetTokenRepository.delete({
      expires_at: LessThan(resetCutoff),
    });
    results.passwordResetTokens = resetResult.affected || 0;

    // Revoked tokens (7 days)
    const revokedCutoff = new Date();
    revokedCutoff.setDate(revokedCutoff.getDate() - 7);
    const revokedResult = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('revoked_at IS NOT NULL')
      .andWhere('revoked_at < :cutoffDate', { cutoffDate: revokedCutoff })
      .execute();
    results.revokedTokens = revokedResult.affected || 0;

    this.logger.log('Manual cleanup complete:', results);
    return results;
  }
}
