import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email: string;
}
