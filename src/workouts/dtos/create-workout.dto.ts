import { IsString, Length } from 'class-validator';

export class CreateWorkoutDto {
  @IsString()
  @Length(2, 50, {
    message: 'Title must be minimum 2 characters and not exceed 50 characters',
  })
  title: string;
}
