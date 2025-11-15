import { Test, TestingModule } from '@nestjs/testing';
import { EmailService, MAIL_PROVIDER } from './email.service';
import { ConfigService } from '@nestjs/config';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: {} },
        { provide: MAIL_PROVIDER, useValue: {} },
        {
          provide: 'PinoLogger:EmailService',
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            fatal: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
