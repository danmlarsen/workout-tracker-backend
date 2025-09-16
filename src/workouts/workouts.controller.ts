import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dtos/create-workout.dto';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';

@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  getAllWorkouts() {
    return this.workoutsService.getAllWorkouts();
  }

  @Post()
  createWorkout(@Body() body: CreateWorkoutDto) {
    const userId = 1;
    return this.workoutsService.createWorkout(body, userId);
  }

  @Post('/:id/workoutExercises')
  createWorkoutExercise(
    @Param('id') id: number,
    @Body() body: CreateWorkoutExerciseDto,
  ) {
    console.log(body);
    return `Create workout exercise for workout id: ${id} with exercise id ${body.exerciseId}`;
  }

  @Post('/:id/workoutExercises/:workoutExerciseId/sets')
  createWorkoutSet(
    @Param('id') id: number,
    @Param('workoutExerciseId') workoutExerciseId: number,
    @Body() body: CreateWorkoutSetDto,
  ) {
    console.log(body);
    return `Create workout set for workout id: ${id} and exercise id: ${workoutExerciseId}`;
  }
}
