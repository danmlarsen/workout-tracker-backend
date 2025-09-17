import { Injectable } from '@nestjs/common';
import { RegisterUserDto } from 'src/auth/dtos/register-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }

  getAllUsers() {
    return this.prismaService.user.findMany();
  }

  createUser(data: RegisterUserDto) {
    return this.prismaService.user.create({ data });
  }
}
