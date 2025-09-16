import { IsNumber } from 'class-validator';

export class CreateWorkoutExerciseDto {
  @IsNumber()
  exerciseId: number;
}
