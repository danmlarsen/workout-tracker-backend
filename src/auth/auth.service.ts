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

    return plainToInstance(UserResponseDto, newUser, {
      excludeExtraneousValues: true,
    });
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

  async resendConfirmationEmail(email: string) {
    const user = await this.usersService.getUser({ email });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isEmailConfirmed) {
      throw new ConflictException('Email is already confirmed');
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

  async requestPasswordReset(email: string) {
    const user = await this.usersService.getUser({ email });

    if (!user) {
      throw new UnauthorizedException('User not found');
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

    const token = await this.createPasswordResetToken(user.id);

    await this.emailService.sendPasswordResetEmail(user.email, token.token);

    return {
      success: true,
      message: 'A password reset link has been sent',
    };
  }

  async resetPassword(tokenString: string, newPassword: string) {
    const token = await this.prismaService.passwordResetToken.findUnique({
      where: { token: tokenString },
      include: { user: true },
    });

    if (!token || token.expiresAt < new Date() || token.isUsed) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await this.hashPassword(newPassword);

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

  private createPasswordResetToken(userId: number) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    return this.prismaService.passwordResetToken.create({
      data: {
        token,
        expiresAt,
        userId,
      },
    });
  }
}
