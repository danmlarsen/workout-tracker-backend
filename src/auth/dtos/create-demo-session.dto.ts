import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDemoSessionDto {
  @IsString()
  @IsNotEmpty()
  captchaToken: string;
}
