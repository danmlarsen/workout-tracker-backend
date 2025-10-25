import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class UpdateExerciseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }: { value: string[] }) =>
    value.map((item: string) => item.toLowerCase()),
  )
  targetMuscleGroups: string[];

  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Transform(({ value }: { value: string[] }) =>
    value.map((item: string) => item.toLowerCase()),
  )
  secondaryMuscleGroups: string[];

  @IsString()
  @IsNotEmpty()
  equipment: string;
}
