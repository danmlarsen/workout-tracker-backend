import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type AuthUser } from 'src/common/types/auth-user.interface';
import { WorkoutManagementService } from './workout-management.service';
import { WorkoutExerciseService } from './workout-exercise.service';
import { WorkoutSetService } from './workout-set.service';
import { WorkoutQueryService } from './workout-query.service';
import { UpdateWorkoutExerciseDto } from './dtos/update-workout-exercise.dto';

@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(
    private readonly workoutManagement: WorkoutManagementService,
    private readonly workoutExercise: WorkoutExerciseService,
    private readonly workoutSet: WorkoutSetService,
    private readonly workoutQuery: WorkoutQueryService,
  ) {}

  @Get()
  getCompletedWorkouts(
    @CurrentUser() user: AuthUser,
    @Query('cursor', new ParseIntPipe({ optional: true })) cursor?: number,
    @Query('date') date?: string,
  ) {
    return this.workoutQuery.getCompletedWorkouts(user.id, { cursor, date });
  }

  @Get('count')
  getCompletedWorkoutsCount(@CurrentUser() user: AuthUser) {
    return this.workoutQuery.getCompletedWorkoutsCount(user.id);
  }

  @Get('calendar')
  getWorkoutCalendar(
    @CurrentUser() user: AuthUser,
    @Query('year', new ParseIntPipe()) year: number,
  ) {
    return this.workoutQuery.getWorkoutCalendar(user.id, year);
  }

  @Get('stats')
  getWorkoutStats(@CurrentUser() user: AuthUser) {
    return this.workoutQuery.getWorkoutStats(user.id);
  }

  @Get('active')
  getActiveWorkout(@CurrentUser() user: AuthUser) {
    return this.workoutManagement.getActiveWorkout(user.id);
  }

  @Get(':workoutId')
  getWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutManagement.getWorkout(workoutId, user.id);
  }

  @Post('')
  createWorkoutDraft(@CurrentUser() user: AuthUser) {
    return this.workoutManagement.createWorkoutDraft(user.id);
  }

  @Post('active')
  createActiveWorkout(@CurrentUser() user: AuthUser) {
    return this.workoutManagement.createActiveWorkout(user.id);
  }

  @Patch('active/pause')
  pauseActiveWorkout(@CurrentUser() user: AuthUser) {
    return this.workoutManagement.pauseActiveWorkout(user.id);
  }

  @Patch('active/resume')
  resumeActiveWorkout(@CurrentUser() user: AuthUser) {
    return this.workoutManagement.resumeActiveWorkout(user.id);
  }

  @Post(':workoutId/complete')
  completeWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutManagement.completeWorkout(user.id, workoutId);
  }

  @Delete('active')
  deleteActiveWorkout(@CurrentUser() user: AuthUser) {
    return this.workoutManagement.deleteActiveWorkout(user.id);
  }

  @Patch(':workoutId')
  updateWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateWorkoutDto,
  ) {
    return this.workoutManagement.updateWorkout(workoutId, user.id, body);
  }

  @Delete(':workoutId')
  deleteWorkout(
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutManagement.deleteWorkout(workoutId, user.id);
  }

  @Post(':workoutId/workoutExercises')
  createWorkoutExercise(
    @CurrentUser() user: AuthUser,
    @Param('workoutId', ParseIntPipe) workoutId: number,
    @Body() body: CreateWorkoutExerciseDto,
  ) {
    return this.workoutExercise.createWorkoutExercise(user.id, workoutId, body);
  }

  @Patch(':workoutId/workoutExercises/:workoutExerciseId')
  updateWorkoutExercise(
    @CurrentUser() user: AuthUser,
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
    @Body() body: UpdateWorkoutExerciseDto,
  ) {
    return this.workoutExercise.updateWorkoutExercise(
      user.id,
      workoutExerciseId,
      body,
    );
  }

  @Delete(':workoutId/workoutExercises/:workoutExerciseId')
  deleteWorkoutExercise(
    @CurrentUser() user: AuthUser,
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
  ) {
    return this.workoutExercise.deleteWorkoutExercise(
      user.id,
      workoutExerciseId,
    );
  }

  @Get(':workoutId/workoutExercises/:workoutExerciseId/sets')
  getWorkoutExerciseSets(
    @CurrentUser() user: AuthUser,
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
  ) {
    return this.workoutExercise.getWorkoutExerciseSets(
      workoutExerciseId,
      user.id,
    );
  }

  @Post(':workoutId/workoutExercises/:workoutExerciseId/sets')
  createWorkoutSet(
    @CurrentUser() user: AuthUser,
    @Param('workoutExerciseId', ParseIntPipe) workoutExerciseId: number,
    @Body() body: CreateWorkoutSetDto,
  ) {
    return this.workoutSet.createWorkoutSet(workoutExerciseId, user.id, body);
  }

  @Patch(':workoutId/workoutExercises/:workoutExerciseId/sets/:setId')
  updateWorkoutSet(
    @Param('setId', ParseIntPipe) setId: number,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateWorkoutSetDto,
  ) {
    return this.workoutSet.updateWorkoutSet(setId, user.id, body);
  }

  @Delete(':workoutId/workoutExercises/:workoutExerciseId/sets/:setId')
  deleteWorkoutSet(
    @Param('setId', ParseIntPipe) setId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workoutSet.deleteWorkoutSet(setId, user.id);
  }
}
