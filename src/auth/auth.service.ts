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

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async registerUser(data: RegisterUserDto) {
    const foundUser = await this.usersService.getUser({ email: data.email });
    if (foundUser) throw new ConflictException('email is already in use');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await this.usersService.createUser({
      email: data.email,
      password: hashedPassword,
    });

    return plainToInstance(UserResponseDto, newUser, {
      excludeExtraneousValues: true,
    });
  }

  async validateUser(data: LoginUserDto) {
    const user = await this.usersService.getUser({ email: data.email });
    if (!user) throw new UnauthorizedException('error logging in');

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new UnauthorizedException('error logging in');

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
