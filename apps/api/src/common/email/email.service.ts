/**
 * Email Service
 *
 * Provides email sending functionality for password reset and other transactional emails.
 * Supports multiple providers: console logging (dev), SMTP, SendGrid, or AWS SES.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type EmailProvider = 'console' | 'smtp' | 'sendgrid' | 'ses';

@Injectable()
export class EmailService {
  private readonly provider: EmailProvider;
  private readonly fromEmail: string;
  private readonly appName: string;
  private readonly appBaseUrl: string;

  constructor(configService: ConfigService) {
    this.provider =
      (configService.get<EmailProvider>('EMAIL_PROVIDER') as EmailProvider) ||
      'console';
    this.fromEmail =
      configService.get<string>('EMAIL_FROM') || 'noreply@blastoise.app';
    this.appName = configService.get<string>('APP_NAME') || 'Blastoise';
    this.appBaseUrl =
      configService.get<string>('APP_BASE_URL') || 'http://localhost:4200';
  }

  /**
   * Send an email using the configured provider
   */
  async send(options: EmailOptions): Promise<void> {
    switch (this.provider) {
      case 'console':
        await this.sendConsole(options);
        break;
      case 'smtp':
        await this.sendSmtp(options);
        break;
      case 'sendgrid':
        await this.sendSendGrid(options);
        break;
      case 'ses':
        await this.sendSes(options);
        break;
      default:
        await this.sendConsole(options);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.appBaseUrl}/auth/password-reset?token=${resetToken}`;

    const subject = `Reset your ${this.appName} password`;

    const text = `
You requested to reset your password for ${this.appName}.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request this password reset, you can safely ignore this email.

- The ${this.appName} Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${this.appName}</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
    <p>You requested to reset your password for ${this.appName}.</p>
    <p>Click the button below to reset your password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
    </div>
    <p style="color: #666; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
    <p style="color: #666; font-size: 14px;">If you did not request this password reset, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #e1e1e1; margin: 30px 0;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
    </p>
  </div>
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>&copy; ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();

    await this.send({
      to: email,
      subject,
      text,
      html,
    });
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(email: string): Promise<void> {
    const subject = `Welcome to ${this.appName}!`;

    const text = `
Welcome to ${this.appName}!

Your account has been created successfully. You can now start tracking your brewery and winery visits.

Visit ${this.appBaseUrl} to get started.

- The ${this.appName} Team
    `.trim();

    await this.send({
      to: email,
      subject,
      text,
    });
  }

  /**
   * Console provider - logs to console (for development)
   */
  private async sendConsole(options: EmailOptions): Promise<void> {
    console.log('='.repeat(60));
    console.log('📧 EMAIL (console provider)');
    console.log('='.repeat(60));
    console.log(`From: ${this.fromEmail}`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('-'.repeat(60));
    console.log('Text Content:');
    console.log(options.text);
    console.log('='.repeat(60));
  }

  /**
   * SMTP provider - sends via SMTP server
   * Requires: nodemailer package and SMTP_* env vars
   */
  private async sendSmtp(options: EmailOptions): Promise<void> {
    // This would use nodemailer - placeholder for now
    // To implement:
    // 1. npm install nodemailer @types/nodemailer
    // 2. Create transport with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
    // 3. Send mail using transport
    console.warn(
      'SMTP provider not fully implemented. Install nodemailer and configure SMTP_* env vars.'
    );
    await this.sendConsole(options);
  }

  /**
   * SendGrid provider - sends via SendGrid API
   * Requires: @sendgrid/mail package and SENDGRID_API_KEY env var
   */
  private async sendSendGrid(options: EmailOptions): Promise<void> {
    // This would use @sendgrid/mail - placeholder for now
    // To implement:
    // 1. npm install @sendgrid/mail
    // 2. Import and configure with SENDGRID_API_KEY
    // 3. Send using sgMail.send()
    console.warn(
      'SendGrid provider not fully implemented. Install @sendgrid/mail and set SENDGRID_API_KEY.'
    );
    await this.sendConsole(options);
  }

  /**
   * AWS SES provider - sends via AWS Simple Email Service
   * Requires: @aws-sdk/client-ses package and AWS credentials
   */
  private async sendSes(options: EmailOptions): Promise<void> {
    // This would use AWS SES SDK - placeholder for now
    // To implement:
    // 1. npm install @aws-sdk/client-ses
    // 2. Configure SESClient with region and credentials
    // 3. Send using SendEmailCommand
    console.warn(
      'AWS SES provider not fully implemented. Install @aws-sdk/client-ses and configure AWS credentials.'
    );
    await this.sendConsole(options);
  }
}
