import { IsOptional, IsString } from 'class-validator';

export class UpdateWorkoutExerciseDto {
  @IsString()
  @IsOptional()
  notes: string;
}
