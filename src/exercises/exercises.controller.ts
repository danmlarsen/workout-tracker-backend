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
import { ExercisesService } from './exercises.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type AuthUser } from 'src/common/types/auth-user.interface';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { UpdateExerciseDto } from './dtos/update-exercise.dto';

@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  getAllExercises(@CurrentUser() user: AuthUser) {
    return this.exercisesService.findAllExercises(user.id);
  }

  @Get(':exerciseId')
  getExercise(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.exercisesService.findExerciseById(user.id, exerciseId);
  }

  @Post()
  createExercise(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateExerciseDto,
  ) {
    return this.exercisesService.createExercise(user.id, body);
  }

  @Patch(':exerciseId')
  updateExercise(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Body() body: UpdateExerciseDto,
  ) {
    return this.exercisesService.updateExercise(user.id, exerciseId, body);
  }

  @Delete(':exerciseId')
  deleteExercise(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.exercisesService.deleteExercise(user.id, exerciseId);
  }

  @Get(':exerciseId/workouts')
  getExerciseWorkouts(
    @CurrentUser() user: AuthUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.exercisesService.getExerciseWorkouts(user.id, exerciseId);
  }
}
