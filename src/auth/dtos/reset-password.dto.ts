import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(5, { message: 'Password must be at least 5 characters long' })
  password: string;
}
