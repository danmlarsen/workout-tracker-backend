import { IsNumber, IsOptional } from 'class-validator';

export class CreateWorkoutSetDto {
  @IsOptional()
  @IsNumber()
  reps: number;

  @IsOptional()
  @IsNumber()
  weight: number;

  @IsOptional()
  @IsNumber()
  duration: number;
}
