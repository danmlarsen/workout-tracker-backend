import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { type Response } from 'express';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { REFRESH_TOKEN_COOKIE } from 'src/common/constants';
import { type AuthUser } from 'src/common/types/auth-user.interface';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ResendConfirmationDto } from './dtos/resend-confirmation.dto';
import { RequestPasswordResetDto } from './dtos/request-password-reset.dto';
import { ClientInfo } from 'src/common/decorators/client-info.decorator';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dtos/user-response.dto';
import { CreateDemoSessionDto } from './dtos/create-demo-session.dto';
import { DemoService } from './demo.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly demoService: DemoService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterUserDto) {
    const newUser = await this.authService.registerUser(body);
    return plainToInstance(UserResponseDto, newUser, {
      excludeExtraneousValues: true,
    });
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, ...loginData } =
      await this.authService.login(user);

    res.cookie(REFRESH_TOKEN_COOKIE, refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms(
        (this.configService.get<string>('JWT_REFRESH_EXP') ||
          '30d') as unknown as StringValue,
      ),
    });

    return { access_token, refresh_token, ...loginData };
  }

  @Post('refresh')
  async refresh(
    @Request()
    req: {
      cookies?: { refresh_token?: string };
      body?: { refresh_token?: string };
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refresh_token = req.cookies?.refresh_token || req.body?.refresh_token;
    if (!refresh_token) {
      throw new UnauthorizedException('Refresh token required');
    }

    try {
      const { access_token } =
        await this.authService.refreshTokens(refresh_token);
      return { access_token };
    } catch {
      res.clearCookie(REFRESH_TOKEN_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { status: 'success' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('whoami')
  whoAmI(@CurrentUser() user: AuthUser) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Get('confirm/:token')
  async confirmEmail(@Param('token') token: string) {
    return this.authService.confirmEmail(token);
  }

  @Post('resend-confirmation')
  async resendConfirmation(@Body() body: ResendConfirmationDto) {
    return this.authService.resendConfirmationEmail(body);
  }

  @Post('request-password-reset')
  async requestPasswordReset(
    @Body() body: RequestPasswordResetDto,
    @ClientInfo() clientInfo: ClientInfo,
  ) {
    return this.authService.requestPasswordReset(
      body,
      clientInfo.ip,
      clientInfo.userAgent,
    );
  }

  @Post('password-reset/:token')
  async resetPassword(
    @Param('token') token: string,
    @Body() body: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(token, body);
  }

  @Post('demo/create-session')
  async createDemoSession(
    @Body() body: CreateDemoSessionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, ...loginData } =
      await this.demoService.createDemoSession(body.token);

    // Set refresh token cookie (shorter duration for demo)
    res.cookie(REFRESH_TOKEN_COOKIE, refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms('2h'), // 2 hours for demo sessions
    });

    return { access_token, ...loginData };
  }
}
