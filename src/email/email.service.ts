import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  async sendConfirmationEmail(email: string, token: string) {
    const confirmationUrl = `${this.configService.get('FRONTEND_URL')}/confirm-email?token=${token}`;
    const emailContent = {
      to: email,
      subject: 'Confirm your email address',
      html: `
        <h1>Welcome to Workout Tracker!</h1>
        <p>Please click the link below to confirm your email address:</p>
        <a href="${confirmationUrl}">Confirm Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    await Promise.resolve();

    // Send email implementation here
    console.log('Sending confirmation email:', emailContent);
  }
}
