import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

export class ResendConfirmationDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  email: string;
}
