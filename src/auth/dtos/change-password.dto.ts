import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(5, { message: 'Password must be at least 5 characters long' })
  newPassword: string;
}
