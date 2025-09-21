import { IsString } from 'class-validator';

export class UpdateExerciseDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  muscleGroup: string;

  @IsString()
  equipment: string;
}
