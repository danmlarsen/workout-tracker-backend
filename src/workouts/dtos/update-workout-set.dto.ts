import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { WorkoutSetType } from '../types/workout.types';

export class UpdateWorkoutSetDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @IsInt()
  @Max(1000)
  reps: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  weight: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Max(86400)
  duration: number;

  @IsOptional()
  @IsBoolean()
  completed: boolean;

  @IsOptional()
  @IsIn(Object.values(WorkoutSetType))
  type: WorkoutSetType;
}
