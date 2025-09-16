import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutDto } from './dtos/create-workout.dto';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prismaService: PrismaService) {}

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

  async createWorkout(data: CreateWorkoutDto, userId: number) {
    return this.prismaService.workout.create({
      data: { title: data.title, userId },
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
