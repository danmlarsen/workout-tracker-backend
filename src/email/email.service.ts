import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Simple interface for mail provider
export interface MailProvider {
  send(emailData: {
    to: string;
    from: string;
    subject: string;
    html: string;
  }): Promise<void>;
}

export const MAIL_PROVIDER = 'MAIL_PROVIDER';

@Injectable()
export class EmailService {
  constructor(
    private configService: ConfigService,
    @Inject(MAIL_PROVIDER) private mailProvider: MailProvider,
  ) {}

  async sendConfirmationEmail(email: string, token: string) {
    const confirmationUrl = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/confirm-email?token=${token}`;
    const emailContent = {
      to: email,
      from: this.configService.getOrThrow<string>(
        'SENDGRID_VERIFIED_SENDER_EMAIL',
      ),
      subject: 'Confirm your email address',
      html: `
        <h1>Welcome to NextLift - Workout Tracker</h1>
        <p>Please click the link below to confirm your email address:</p>
        <a href="${confirmationUrl}">Confirm Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    return await this.mailProvider.send(emailContent);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetLink = `${this.configService.getOrThrow<string>('FRONTEND_URL')}/reset-password?token=${token}`;
    const emailContent = {
      to: email,
      from: this.configService.getOrThrow<string>(
        'SENDGRID_VERIFIED_SENDER_EMAIL',
      ),
      subject: 'Your password reset request',
      html: `
        <h1>NextLift - Workout Tracker</h1>
        <p>Hey, ${email}! You requested to reset your password.</p>
        <p>Here is your password reset link: <a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 15 minutes.</p>
      `,
    };

    return await this.mailProvider.send(emailContent);
  }
}
