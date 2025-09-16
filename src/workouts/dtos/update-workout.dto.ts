import { IsString } from 'class-validator';

export class UpdateWorkoutDto {
  @IsString()
  title: string;
}
