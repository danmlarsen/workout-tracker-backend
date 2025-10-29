import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email: string;

  @IsString()
  password: string;
}
