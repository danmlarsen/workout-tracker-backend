import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateWorkoutSetDto {
  @IsOptional()
  @IsNumber()
  reps: number;

  @IsOptional()
  @IsNumber()
  weight: number;

  @IsOptional()
  @IsNumber()
  duration: number;

  @IsOptional()
  @IsBoolean()
  completed: boolean;
}
