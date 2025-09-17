import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RegisterUserDto } from 'src/auth/dtos/register-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  getUser(filter: Prisma.UserWhereUniqueInput) {
    return this.prismaService.user.findUnique({ where: filter });
  }

  getAllUsers() {
    return this.prismaService.user.findMany();
  }

  createUser(data: RegisterUserDto) {
    return this.prismaService.user.create({ data });
  }
}
