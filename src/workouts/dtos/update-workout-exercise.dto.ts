import { IsString } from 'class-validator';

export class UpdateWorkoutExerciseDto {
  @IsString()
  notes: string;
}
