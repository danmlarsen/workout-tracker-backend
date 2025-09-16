import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutDto } from './dtos/create-workout.dto';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prismaService: PrismaService) {}

  async getWorkout(id: number) {
    return this.prismaService.workout.findUnique({
      where: { id },
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            workoutSets: true,
          },
        },
      },
    });
  }

  async getAllWorkouts() {
    return this.prismaService.workout.findMany({
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            workoutSets: true,
          },
        },
      },
    });
  }

  async createWorkout(userId: number, data: CreateWorkoutDto) {
    return this.prismaService.workout.create({
      data: { title: data.title, userId },
    });
  }

  async updateWorkout(id: number, data: UpdateWorkoutDto) {
    return this.prismaService.workout.update({
      data,
      where: { id },
    });
  }

  async deleteWorkout(id: number) {
    return this.prismaService.workout.delete({ where: { id } });
  }

  async createWorkoutExercise(
    workoutId: number,
    data: CreateWorkoutExerciseDto,
  ) {
    return this.prismaService.workoutExercise.create({
      data: { workoutId, exerciseId: data.exerciseId },
    });
  }

  async createWorkoutSet(workoutExerciseId: number, data: CreateWorkoutSetDto) {
    return this.prismaService.workoutSet.create({
      data: { ...data, workoutExerciseId },
    });
  }
}
