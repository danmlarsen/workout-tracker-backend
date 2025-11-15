import { Test, TestingModule } from '@nestjs/testing';
import { ExercisesService } from './exercises.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ExercisesService', () => {
  let service: ExercisesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        { provide: PrismaService, useValue: {} },
        {
          provide: 'PinoLogger:ExercisesService',
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

    service = module.get<ExercisesService>(ExercisesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
