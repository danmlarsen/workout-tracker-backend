import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { UserResponseDto } from './dtos/user-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.authService.registerUser(body);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: { user: UserResponseDto }) {
    return req.user;
  }

  @UseGuards(LocalAuthGuard)
  @Post('logout')
  logout(@Request() req: { logout: () => void }) {
    return req.logout();
  }
}
