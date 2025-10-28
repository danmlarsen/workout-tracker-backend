import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  getUser(filter: Prisma.UserWhereInput) {
    return this.prismaService.user.findFirst({ where: filter });
  }

  getAllUsers() {
    return this.prismaService.user.findMany();
  }

  createUser(data: Prisma.UserCreateInput) {
    return this.prismaService.user.create({ data });
  }

  updateUser(id: number, data: Prisma.UserUpdateInput) {
    return this.prismaService.user.update({ where: { id }, data });
  }
}
