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
        const apiKey: string | undefined =
          configService.get('SENDGRID_API_KEY');

        if (apiKey) {
          sgMail.setApiKey(apiKey);
          return sgMail;
        }

        return {
          send: (emailData: any) => {
            console.log(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Mock email sent to: ${emailData.to} - Subject: ${emailData.subject}`,
            );
          },
        };
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
