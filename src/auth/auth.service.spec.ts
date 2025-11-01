/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';
import { Prisma, User } from '@prisma/client';
import { RegisterUserDto } from './dtos/register-user.dto';
import bcrypt from 'bcrypt';

const mockPrismaService = {
  emailConfirmationToken: {
    create: jest.fn().mockResolvedValue({
      token: 'mock-confirmation-token',
    }),
  },
};

const mockUser: User = {
  id: 1,
  email: 'test@test.com',
  password: 'hashedPassword',
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshToken: null,
  isEmailConfirmed: true,
};

const mockUsersService: Partial<UsersService> = {
  getUser: jest.fn().mockImplementation((filter: Prisma.UserWhereInput) => {
    if (filter.email === 'test@test.com' || filter.id === 1) {
      return Promise.resolve(mockUser);
    }
    return Promise.resolve(null);
  }),
  createUser: jest.fn().mockImplementation((data: Prisma.UserCreateInput) => {
    return Promise.resolve({
      ...mockUser,
      email: data.email,
      password: data.password,
      isEmailConfirmed: data.isEmailConfirmed || false,
    });
  }),
  updateUser: jest
    .fn()
    .mockImplementation((id: number, data: Prisma.UserUpdateInput) => {
      return Promise.resolve({ ...mockUser, ...data });
    }),
};

const mockEmailService = {
  sendConfirmationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks(); // Clear all mock call history

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerUser', () => {
    let newUserInput: RegisterUserDto;

    beforeEach(() => {
      newUserInput = {
        email: 'new@example.com',
        password: 'plainPassword',
      };
    });

    it('should throw ConflictException when user already exists', async () => {
      const existingUserInput: RegisterUserDto = {
        email: 'test@test.com', // This email exists in our mock
        password: 'password',
      };

      await expect(service.registerUser(existingUserInput)).rejects.toThrow(
        'Email is already in use',
      );

      expect(mockUsersService.getUser).toHaveBeenCalledWith({
        email: 'test@test.com',
      });
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      const result = await service.registerUser(newUserInput);

      // Verify password is hashed correctly
      const isValidPassword = await bcrypt.compare(
        newUserInput.password,
        result.password,
      );
      expect(isValidPassword).toBe(true);
      expect(result.password).not.toBe(newUserInput.password);
    });

    it('should create user with correct data', async () => {
      const result = await service.registerUser(newUserInput);

      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: expect.any(String), // The hashed password
        isEmailConfirmed: false,
      });

      expect(result.email).toBe(newUserInput.email);
      expect(result.isEmailConfirmed).toBe(false);
    });

    it('should create email confirmation token and send confirmation email', async () => {
      await service.registerUser(newUserInput);

      expect(
        mockPrismaService.emailConfirmationToken.create,
      ).toHaveBeenCalledWith({
        data: {
          token: expect.any(String),
          expiresAt: expect.any(Date),
          userId: 1,
        },
      });

      expect(mockEmailService.sendConfirmationEmail).toHaveBeenCalledWith(
        'new@example.com',
        'mock-confirmation-token',
      );
    });

    it('should return the created user', async () => {
      const result = await service.registerUser(newUserInput);

      expect(result).toMatchObject({
        id: expect.any(Number),
        email: 'new@example.com',
        isEmailConfirmed: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result.password).toBeDefined();
    });

    it('should handle createUser failure', async () => {
      (mockUsersService.createUser as jest.Mock).mockRejectedValueOnce(
        new Error('Database error'),
      );

      await expect(service.registerUser(newUserInput)).rejects.toThrow(
        'Database error',
      );
    });

    it('should handle email confirmation token creation failure', async () => {
      mockPrismaService.emailConfirmationToken.create.mockRejectedValueOnce(
        new Error('Token creation failed'),
      );

      await expect(service.registerUser(newUserInput)).rejects.toThrow(
        'Token creation failed',
      );
    });

    it('should handle email sending failure', async () => {
      mockEmailService.sendConfirmationEmail.mockRejectedValueOnce(
        new Error('Email service unavailable'),
      );

      await expect(service.registerUser(newUserInput)).rejects.toThrow(
        'Email service unavailable',
      );
    });
  });
});
