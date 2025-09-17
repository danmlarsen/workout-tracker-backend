import { Body, Controller, Post } from '@nestjs/common';
import { RegisterUserDto } from './dtos/register-user.dto';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dtos/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterUserDto) {
    return this.authService.registerUser(body);
  }

  @Post('login')
  login(@Body() body: LoginUserDto) {
    return this.authService.validateUser(body);
  }

  @Post('logout')
  logout() {}
}
