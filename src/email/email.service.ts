import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {
    const apikey: string = this.configService.getOrThrow('SENDGRID_API_KEY');
    sgMail.setApiKey(apikey);
  }

  async sendConfirmationEmail(email: string, token: string) {
    const confirmationUrl = `${this.configService.get('FRONTEND_URL')}/confirm-email?token=${token}`;
    const emailContent = {
      to: email,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      from: this.configService.getOrThrow('SENDGRID_VERIFIED_SENDER_EMAIL'),
      subject: 'Confirm your email address',
      html: `
        <h1>Welcome to Workout Tracker!</h1>
        <p>Please click the link below to confirm your email address:</p>
        <a href="${confirmationUrl}">Confirm Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    return await sgMail.send(emailContent);
  }
}
