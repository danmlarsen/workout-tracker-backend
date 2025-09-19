import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto } from './dtos/create-workout.dto';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserResponseDto } from 'src/auth/dtos/user-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  getAllWorkouts(@CurrentUser() user: UserResponseDto) {
    return this.workoutsService.getAllWorkouts(user.id);
  }

  @Get(':workoutId')
  getWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: UserResponseDto,
  ) {
    return this.workoutsService.getWorkout(workoutId, user.id);
  }

  @Post()
  createWorkout(
    @Body() body: CreateWorkoutDto,
    @CurrentUser() user: UserResponseDto,
  ) {
    return this.workoutsService.createWorkout(user.id, body);
  }

  @Patch(':workoutId')
  updateWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: UserResponseDto,
    @Body() body: UpdateWorkoutDto,
  ) {
    return this.workoutsService.updateWorkout(workoutId, user.id, body);
  }

  @Delete(':workoutId')
  deleteWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: UserResponseDto,
  ) {
    return this.workoutsService.deleteWorkout(workoutId, user.id);
  }

  @Post(':workoutId/workoutExercises')
  createWorkoutExercise(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: UserResponseDto,
    @Body() body: CreateWorkoutExerciseDto,
  ) {
    return this.workoutsService.createWorkoutExercise(workoutId, user.id, body);
  }

  @Get(':workoutId/workoutExercises/:workoutExerciseId/sets')
  getWorkoutExerciseSets(
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
    @CurrentUser() user: UserResponseDto,
  ) {
    return this.workoutsService.getWorkoutExerciseSets(
      workoutExerciseId,
      user.id,
    );
  }

  @Post(':workoutId/workoutExercises/:workoutExerciseId/sets')
  createWorkoutSet(
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
    @CurrentUser() user: UserResponseDto,
    @Body() body: CreateWorkoutSetDto,
  ) {
    return this.workoutsService.createWorkoutSet(
      workoutExerciseId,
      user.id,
      body,
    );
  }

  @Patch(':workoutId/workoutExercises/:workoutExerciseId/sets/:setId')
  updateWorkoutSet(
    @Param('setId', ParseIntPipe) setId: number,
    @CurrentUser() user: UserResponseDto,
    @Body() body: UpdateWorkoutSetDto,
  ) {
    return this.workoutsService.updateWorkoutSet(setId, user.id, body);
  }
}
