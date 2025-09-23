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
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type AuthUser } from 'src/common/types/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  getAllWorkouts(@CurrentUser() user: AuthUser) {
    return this.workoutsService.getAllWorkouts(user.id);
  }

  @Get('active')
  getActiveWorkout(@CurrentUser() user: AuthUser) {
    return this.workoutsService.getActiveWorkout(user.id);
  }

  @Get(':workoutId')
  getWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutsService.getWorkout(workoutId, user.id);
  }

  @Post()
  createWorkout(@CurrentUser() user: AuthUser) {
    return this.workoutsService.createWorkout(user.id);
  }

  @Post(':workoutId/complete')
  completeWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutsService.completeWorkout(user.id, workoutId);
  }

  @Patch(':workoutId')
  updateWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateWorkoutDto,
  ) {
    return this.workoutsService.updateWorkout(workoutId, user.id, body);
  }

  @Delete(':workoutId')
  deleteWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutsService.deleteWorkout(workoutId, user.id);
  }

  @Post(':workoutId/workoutExercises')
  createWorkoutExercise(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateWorkoutExerciseDto,
  ) {
    return this.workoutsService.createWorkoutExercise(workoutId, user.id, body);
  }

  @Get(':workoutId/workoutExercises/:workoutExerciseId/sets')
  getWorkoutExerciseSets(
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutsService.getWorkoutExerciseSets(
      workoutExerciseId,
      user.id,
    );
  }

  @Post(':workoutId/workoutExercises/:workoutExerciseId/sets')
  createWorkoutSet(
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
    @CurrentUser() user: AuthUser,
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
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateWorkoutSetDto,
  ) {
    return this.workoutsService.updateWorkoutSet(setId, user.id, body);
  }
}
