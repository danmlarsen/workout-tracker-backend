import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterUserDto } from './dtos/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dtos/login-user.dto';
import { UserResponseDto } from './dtos/user-response.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from 'src/common/types/jwt-payload.interface';
import * as crypto from 'crypto';
import { EmailService } from 'src/email/email.service';
import { EmailNotConfirmedException } from 'src/common/exceptions/email-not-confirmed-exception';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ResendConfirmationDto } from './dtos/resend-confirmation.dto';
import { RequestPasswordResetDto } from './dtos/request-password-reset.dto';
import { RecaptchaResponse } from 'src/common/types/recaptcha-response';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {}

  async registerUser(data: RegisterUserDto) {
    this.logger.info(`Attempting to register user with email`, {
      email: data.email,
    });

    const foundUser = await this.usersService.getUser({ email: data.email });
    if (foundUser) {
      this.logger.warn(`Registration failed: Email already in use`, {
        email: data.email,
      });
      throw new ConflictException('Email is already in use');
    }

    const hashedPassword = await this.hashPassword(data.password);

    const newUser = await this.usersService.createUser({
      email: data.email,
      password: hashedPassword,
      isEmailConfirmed: false,
    });

    const token = await this.createEmailConfirmationToken(newUser.id);

    await this.emailService.sendConfirmationEmail(newUser.email, token.token);

    this.logger.info(`User registered successfully with email: ${data.email}`, {
      userId: newUser.id,
    });
    return newUser;
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    this.logger.info(`User requested password change`, { userId });
    const user = await this.usersService.getUser({ id: userId });

    if (!user) {
      this.logger.warn(`User not found for password change`, { userId });
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      this.logger.warn(`User provided incorrect current password`, { userId });
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      this.logger.warn(`User attempted to change to the same password`, {
        userId,
      });
      throw new ConflictException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await this.hashPassword(newPassword);

    await this.usersService.updateUser(userId, {
      password: hashedNewPassword,
      refreshToken: null,
    });

    this.logger.info(`User changed password successfully`, { userId });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async confirmEmail(tokenString: string) {
    this.logger.info(`Attempting to confirm email with token`);
    const token = await this.prismaService.emailConfirmationToken.findUnique({
      where: { token: tokenString },
      include: { user: true },
    });

    if (!token) {
      this.logger.warn(`Invalid confirmation token`, { token: tokenString });
      throw new UnauthorizedException('Invalid confirmation token');
    }

    if (token.expiresAt < new Date()) {
      this.logger.warn(`Confirmation token has expired`, {
        token: tokenString,
      });
      throw new UnauthorizedException('Confirmation token has expired');
    }

    if (token.isUsed) {
      this.logger.warn(`Confirmation token has already been used`, {
        token: tokenString,
      });
      throw new ConflictException('Token has already been used');
    }

    if (token.user.isEmailConfirmed) {
      this.logger.warn(`Email is already confirmed for user`, {
        userId: token.userId,
      });
      throw new ConflictException('Email is already confirmed');
    }

    // Mark token as used and confirm user email
    await this.prismaService.$transaction([
      this.prismaService.emailConfirmationToken.update({
        where: { id: token.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
      this.prismaService.user.update({
        where: { id: token.userId },
        data: { isEmailConfirmed: true },
      }),
    ]);

    this.logger.info(`Email confirmed successfully for user`, {
      userId: token.userId,
    });

    return {
      success: true,
      message: 'Email confirmed successfully',
    };
  }

  async resendConfirmationEmail(data: ResendConfirmationDto) {
    this.logger.info(`Attempting to resend confirmation email`, {
      email: data.email,
    });
    const user = await this.usersService.getUser({ email: data.email });

    if (!user) {
      this.logger.warn(`User not found for resending confirmation email`, {
        email: data.email,
      });
      throw new UnauthorizedException('User not found');
    }

    if (user.isEmailConfirmed) {
      this.logger.warn(`Email is already confirmed for user`, {
        userId: user.id,
      });
      throw new ConflictException('Email is already confirmed');
    }

    // Check if user has requested in the last 30 seconds
    const recentRequest =
      await this.prismaService.emailConfirmationToken.findFirst({
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 1000), // Last 30 seconds
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    if (recentRequest) {
      const timeLeft = Math.ceil(
        (30000 - (Date.now() - recentRequest.createdAt.getTime())) / 1000,
      );
      this.logger.warn(`User requested confirmation email too soon`, {
        userId: user.id,
        timeLeft,
      });
      throw new UnauthorizedException(
        `Please wait ${timeLeft} seconds before requesting another email confirmation.`,
      );
    }

    // Invalidate existing unused tokens
    await this.prismaService.emailConfirmationToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    const token = await this.createEmailConfirmationToken(user.id);

    await this.emailService.sendConfirmationEmail(user.email, token.token);

    this.logger.info(`Confirmation email resent successfully`, {
      userId: user.id,
    });

    return {
      success: true,
      message: 'Confirmation email sent',
    };
  }

  async validateUser(data: LoginUserDto) {
    this.logger.info(`Validating user`, { email: data.email });
    const user = await this.usersService.getUser({
      email: data.email,
    });
    if (!user) {
      this.logger.warn(`User not found during validation`, {
        email: data.email,
      });
      throw new UnauthorizedException('Invalid email and/or password');
    }

    if (user.userType === 'SYSTEM' || user.userType === 'DEMO') {
      this.logger.warn(`Attempt to login with restricted user type`, {
        email: data.email,
        userType: user.userType,
      });
      throw new UnauthorizedException('Invalid email and/or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      this.logger.warn(`Invalid password attempt`, { email: data.email });
      throw new UnauthorizedException('Invalid email and/or password');
    }

    if (!user.isActive) {
      this.logger.warn(`Attempt to login to disabled account`, {
        email: data.email,
      });
      throw new UnauthorizedException('Account is disabled');
    }

    if (!user.isEmailConfirmed) {
      this.logger.warn(`Attempt to login with unconfirmed email`, {
        email: data.email,
      });
      throw new EmailNotConfirmedException();
    }

    this.logger.info(`User validated successfully`, { email: data.email });
    return user;
  }

  async login(user: UserResponseDto) {
    this.logger.info(`Logging in user`, { userId: user.id, email: user.email });
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXP') || '30d',
    });

    const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
    await this.usersService.updateUser(user.id, {
      refreshToken: hashedRefreshToken,
      lastLoginAt: new Date(),
    });

    this.logger.info(`User logged in successfully`, {
      userId: user.id,
      email: user.email,
    });
    return {
      userId: user.id,
      email: user.email,
      access_token,
      refresh_token,
    };
  }

  async refreshTokens(refreshToken: string) {
    this.logger.info(`Attempting to refresh tokens`);
    let payload: JwtPayload;
    try {
      payload = this.jwtService.decode(refreshToken);
    } catch {
      this.logger.warn(`Invalid refresh token decode attempt`);
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.usersService.getUser({ id: payload.sub });
    if (!user || !user.refreshToken) {
      this.logger.warn(`No user or refresh token found during token refresh`, {
        payload,
      });
      throw new UnauthorizedException('No user or token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      this.logger.warn(`Invalid refresh token attempt`, { userId: user.id });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!user.isActive) {
      this.logger.warn(`Attempt to refresh tokens for disabled account`, {
        userId: user.id,
      });
      throw new UnauthorizedException('Account is disabled');
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    this.logger.info(`Tokens refreshed successfully`, { userId: user.id });
    return {
      access_token: this.jwtService.sign(newPayload),
    };
  }

  async requestPasswordReset(
    data: RequestPasswordResetDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.logger.info(`Password reset requested for email`, {
      email: data.email,
    });
    const user = await this.usersService.getUser({ email: data.email });

    if (!user) {
      this.logger.warn(`User not found for password reset`, {
        email: data.email,
      });
      throw new UnauthorizedException('User not found');
    }

    // Check if user has requested a reset in the last 30 seconds
    const recentRequest = await this.prismaService.passwordResetToken.findFirst(
      {
        where: {
          userId: user.id,
          createdAt: {
            gte: new Date(Date.now() - 30 * 1000), // Last 30 seconds
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    );

    if (recentRequest) {
      const timeLeft = Math.ceil(
        (30000 - (Date.now() - recentRequest.createdAt.getTime())) / 1000,
      );
      this.logger.warn(`User requested password reset too soon`, {
        userId: user.id,
        timeLeft,
      });
      throw new UnauthorizedException(
        `Please wait ${timeLeft} seconds before requesting another password reset.`,
      );
    }

    // Invalidate existing unused tokens
    await this.prismaService.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    const token = await this.createPasswordResetToken(
      user.id,
      ipAddress,
      userAgent,
    );

    await this.emailService.sendPasswordResetEmail(user.email, token.token);

    this.logger.info(`Password reset email sent successfully`, {
      userId: user.id,
    });
    return {
      success: true,
      message: 'A password reset link has been sent',
    };
  }

  async resetPassword(tokenString: string, data: ResetPasswordDto) {
    this.logger.info(`Attempting to reset password with token`);
    const token = await this.prismaService.passwordResetToken.findUnique({
      where: { token: tokenString },
      include: { user: true },
    });

    if (!token || token.expiresAt < new Date() || token.isUsed) {
      this.logger.warn(`Invalid or expired reset token`);
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await this.hashPassword(data.password);

    // Update password, mark token as used, and invalidate refresh tokens
    await this.prismaService.$transaction([
      this.prismaService.passwordResetToken.update({
        where: { id: token.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      }),
      this.prismaService.user.update({
        where: { id: token.userId },
        data: {
          password: hashedPassword,
          refreshToken: null, // Invalidate all sessions
        },
      }),
    ]);

    this.logger.info(`Password reset successfully for user`, {
      userId: token.userId,
    });
    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async verifyCaptcha(token: string) {
    this.logger.info(`Verifying CAPTCHA`);
    const secretKey = this.configService.get<string>('RECAPTCHA_SECRET');

    if (!secretKey) {
      this.logger.error(`RECAPTCHA_SECRET not configured`);
      throw new Error('RECAPTCHA_SECRET not configured');
    }

    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${secretKey}&response=${token}`,
        },
      );

      const result = (await response.json()) as RecaptchaResponse;

      if (!result.success) {
        this.logger.warn(`CAPTCHA verification failed`, { result });
        throw new UnauthorizedException('CAPTCHA verification failed');
      }

      // For reCAPTCHA v3, check the score (0.0 = bot, 1.0 = human)
      if (result.score !== undefined && result.score < 0.5) {
        this.logger.warn(`CAPTCHA score too low`, { score: result.score });
        throw new UnauthorizedException(
          'CAPTCHA score too low - suspicious activity detected',
        );
      }

      if (result.action && result.action !== 'demo_login') {
        this.logger.warn(`CAPTCHA action mismatch`, { action: result.action });
        throw new UnauthorizedException('CAPTCHA action mismatch');
      }

      return result;
    } catch (error: unknown) {
      this.logger.error(`Error during CAPTCHA verification`, { error });
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('CAPTCHA verification failed');
    }
  }

  private hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private createEmailConfirmationToken(userId: number) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return this.prismaService.emailConfirmationToken.create({
      data: {
        token,
        expiresAt,
        userId,
      },
    });
  }

  private createPasswordResetToken(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    return this.prismaService.passwordResetToken.create({
      data: {
        token,
        expiresAt,
        userId,
        ipAddress,
        userAgent,
      },
    });
  }
}
