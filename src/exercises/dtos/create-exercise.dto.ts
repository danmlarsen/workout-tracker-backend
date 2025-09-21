import { IsString } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  muscleGroup: string;

  @IsString()
  equipment: string;
}
