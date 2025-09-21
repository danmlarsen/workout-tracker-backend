import {
  Body,
  Controller,
  Get,
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
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from 'src/common/constants';
import { type AuthUser } from 'src/common/types/auth-user.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}

  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.authService.registerUser(body);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } = await this.authService.login(user);

    res.cookie(ACCESS_TOKEN_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms(
        (this.configService.get<string>('JWT_EXP') ||
          '15m') as unknown as StringValue,
      ),
    });

    res.cookie(REFRESH_TOKEN_COOKIE, refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms(
        (this.configService.get<string>('JWT_REFRESH_EXP') ||
          '30d') as unknown as StringValue,
      ),
    });

    return { access_token, refresh_token };
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
    if (!refresh_token) throw new UnauthorizedException('No refresh token');

    const { access_token } =
      await this.authService.refreshTokens(refresh_token);

    res.cookie(ACCESS_TOKEN_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ms(
        (this.configService.get<string>('JWT_EXP') ||
          '15m') as unknown as StringValue,
      ),
    });

    return { access_token };
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, {
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
}
