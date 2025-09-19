import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserResponseDto } from './dtos/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type Response } from 'express';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

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
  login(
    @CurrentUser() user: UserResponseDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token } = this.authService.login(user);

    const expiresIn = this.configService.getOrThrow<string>('JWT_EXP');
    const maxAge = ms(expiresIn as unknown as StringValue);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    return { access_token };
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { status: 'success' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('whoami')
  whoAmI(@CurrentUser() user: UserResponseDto) {
    return user;
  }
}
