import { Module } from '@nestjs/common';
import { EmailService, MAIL_PROVIDER } from './email.service';
import sgMail from '@sendgrid/mail';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    EmailService,
    {
      provide: MAIL_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const apiKey: string = configService.getOrThrow('SENDGRID_API_KEY');
        sgMail.setApiKey(apiKey);
        return sgMail;
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
