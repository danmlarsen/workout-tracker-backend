import { IsOptional, IsString } from 'class-validator';

export class UpdateWorkoutDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  notes: string;
}
