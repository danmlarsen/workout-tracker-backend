import { Body, Controller, Delete, Res, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type AuthUser } from 'src/common/types/auth-user.interface';
import { DeleteAccountDto } from './dtos/delete-account.dto';
import { type Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from 'src/common/constants';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Delete the current user's account
   * @throws {401} Unauthorized.
   * @throws {400} Invalid password.
   * @throws {404} User not found.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() deleteAccountDto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.usersService.deleteAccount(
      user.id,
      deleteAccountDto.password,
    );

    // Clear cookies since account is deleted
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return result;
  }
}
