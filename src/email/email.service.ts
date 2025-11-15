import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

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
    @InjectPinoLogger(EmailService.name) private readonly logger: PinoLogger,
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
        <h1>NextLift - Workout Tracker</h1>
        <p>Please click the link below to confirm your email address:</p>
        <a href="${confirmationUrl}">Confirm Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    this.logger.info(`Sending confirmation email to ${email}`, {
      email,
      type: 'confirmation',
    });

    try {
      await this.mailProvider.send(emailContent);
    } catch (error) {
      this.logger.error(`Failed to send confirmation email to ${email}`, {
        email,
        type: 'confirmation',
        error: (error as Error).message,
      });
    }
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

    this.logger.info(`Sending password reset email to ${email}`, {
      email,
      type: 'password_reset',
    });

    try {
      await this.mailProvider.send(emailContent);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, {
        email,
        type: 'password_reset',
        error: (error as Error).message,
      });
    }
  }
}
