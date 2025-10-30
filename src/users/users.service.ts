import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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

  async deleteAccount(userId: number, password: string) {
    const user = await this.getUser({ id: userId });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password');
    }

    // Log deletion and delete user in a transaction
    await this.prismaService.$transaction(async (tx) => {
      // Log the deletion
      await tx.deletedUser.create({
        data: {
          originalUserId: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
      });

      // Delete the actual user (cascades will handle related data)
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }
}
