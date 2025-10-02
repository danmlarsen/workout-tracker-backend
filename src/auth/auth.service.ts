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

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerUser(data: RegisterUserDto) {
    const foundUser = await this.usersService.getUser({ email: data.email });
    if (foundUser) throw new ConflictException('Email is already in use');

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
    if (!user) return null;

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) return null;

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
}
