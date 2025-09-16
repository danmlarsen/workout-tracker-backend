import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dtos/create-workout.dto';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';

@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  getAllWorkouts() {
    return this.workoutsService.getAllWorkouts();
  }

  @Get('/:workoutId')
  getWorkout(@Param('workoutId', ParseIntPipe) workoutId: number) {
    return this.workoutsService.getWorkout(workoutId);
  }

  @Post()
  createWorkout(@Body() body: CreateWorkoutDto) {
    const userId = 1;
    return this.workoutsService.createWorkout(userId, body);
  }

  @Patch('/:workoutId')
  updateWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @Body() body: UpdateWorkoutDto,
  ) {
    return this.workoutsService.updateWorkout(workoutId, body);
  }

  @Delete('/:workoutId')
  deleteWorkout(@Param('workoutId', ParseIntPipe) workoutId: number) {
    return this.workoutsService.deleteWorkout(workoutId);
  }

  @Post('/:workoutId/workoutExercises')
  createWorkoutExercise(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @Body() body: CreateWorkoutExerciseDto,
  ) {
    console.log(body);
    return `Create workout exercise for workout id: ${workoutId} with exercise id ${body.exerciseId}`;
  }

  @Post('/:workoutId/workoutExercises/:workoutExerciseId/sets')
  createWorkoutSet(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
    @Body() body: CreateWorkoutSetDto,
  ) {
    console.log(body);
    return `Create workout set for workout id: ${workoutId} and exercise id: ${workoutExerciseId}`;
  }
}
