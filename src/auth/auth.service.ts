import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { RegisterUserDto } from './dtos/register-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dtos/login-user.dto';
import { plainToInstance } from 'class-transformer';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async registerUser(data: RegisterUserDto) {
    const foundUser = await this.usersService.getUser({ email: data.email });
    if (foundUser) throw new ConflictException('Email is already in use');

    const hashedPassword = await this.hashPassword(data.password);

    const newUser = await this.usersService.createUser({
      email: data.email,
      password: hashedPassword,
      isEmailConfirmed: false,
    });

    const token = await this.createEmailConfirmationToken(newUser.id);

    await this.emailService.sendConfirmationEmail(newUser.email, token.token);

    return newUser;
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.getUser({ id: userId });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new ConflictException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await this.hashPassword(newPassword);

    await this.usersService.updateUser(userId, {
      password: hashedNewPassword,
      refreshToken: null,
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async confirmEmail(tokenString: string) {
    const token = await this.prismaService.emailConfirmationToken.findUnique({
      where: { token: tokenString },
      include: { user: true },
    });

    if (!token) {
      throw new UnauthorizedException('Invalid confirmation token');
    }

    if (token.expiresAt < new Date()) {
      throw new UnauthorizedException('Confirmation token has expired');
    }

    if (token.isUsed) {
      throw new ConflictException('Token has already been used');
    }

    if (token.user.isEmailConfirmed) {
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

    return {
      success: true,
      message: 'Email confirmed successfully',
    };
  }

  async resendConfirmationEmail(data: ResendConfirmationDto) {
    const user = await this.usersService.getUser({ email: data.email });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isEmailConfirmed) {
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

    return {
      success: true,
      message: 'Confirmation email sent',
    };
  }

  async validateUser(data: LoginUserDto) {
    const user = await this.usersService.getUser({ email: data.email });
    if (!user) return null;

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailConfirmed) {
      throw new EmailNotConfirmedException();
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async login(user: UserResponseDto) {
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
    });

    return {
      access_token,
      refresh_token,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.decode(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.usersService.getUser({ id: payload.sub });
    if (!user || !user.refreshToken)
      throw new UnauthorizedException('No user or token');

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(newPayload),
    };
  }

  async requestPasswordReset(
    data: RequestPasswordResetDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.usersService.getUser({ email: data.email });

    if (!user) {
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

    return {
      success: true,
      message: 'A password reset link has been sent',
    };
  }

  async resetPassword(tokenString: string, data: ResetPasswordDto) {
    const token = await this.prismaService.passwordResetToken.findUnique({
      where: { token: tokenString },
      include: { user: true },
    });

    if (!token || token.expiresAt < new Date() || token.isUsed) {
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

    return {
      success: true,
      message: 'Password reset successfully',
    };
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
