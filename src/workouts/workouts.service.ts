import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';

@Injectable()
export class WorkoutsService {
  constructor(private prismaService: PrismaService) {}

  async getWorkout(id: number, userId: number) {
    return this.prismaService.workout.findUnique({
      where: { id, userId },
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

  async getAllWorkouts(userId: number) {
    return this.prismaService.workout.findMany({
      where: { userId },
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

  async getActiveWorkout(userId: number) {
    return this.prismaService.workout.findFirst({
      where: { userId, completedAt: null },
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            workoutSets: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWorkout(userId: number) {
    const today = new Date();
    const title = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return this.prismaService.workout.create({
      data: { title, userId },
    });
  }

  async completeWorkout(userId: number, workoutId: number) {
    const workout = await this.prismaService.workout.findFirst({
      where: { id: workoutId, userId, completedAt: null },
    });

    if (!workout) throw new ForbiddenException('Not allowed');

    return this.prismaService.workout.update({
      where: { id: workoutId },
      data: { completedAt: new Date() },
    });
  }

  async updateWorkout(id: number, userId: number, data: UpdateWorkoutDto) {
    return this.prismaService.workout.update({
      where: { id, userId },
      data,
    });
  }

  async deleteWorkout(id: number, userId: number) {
    return this.prismaService.workout.delete({ where: { id, userId } });
  }

  async createWorkoutExercise(
    workoutId: number,
    userId: number,
    data: CreateWorkoutExerciseDto,
  ) {
    const workout = await this.prismaService.workout.findFirst({
      where: { id: workoutId, userId },
    });

    if (!workout) throw new ForbiddenException('Not allowed');

    return this.prismaService.workoutExercise.create({
      data: { workoutId, exerciseId: data.exerciseId },
    });
  }

  async getWorkoutExerciseSets(id: number, userId: number) {
    const workoutExercise = await this.prismaService.workoutExercise.findUnique(
      {
        where: { id },
        include: {
          workout: true,
          workoutSets: true,
          exercise: true,
        },
      },
    );

    console.log(workoutExercise);

    if (!workoutExercise || workoutExercise.workout.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return workoutExercise;
  }

  async createWorkoutSet(
    workoutExerciseId: number,
    userId: number,
    data: CreateWorkoutSetDto,
  ) {
    const workoutExercise = await this.prismaService.workoutExercise.findUnique(
      {
        where: { id: workoutExerciseId },
        include: { workout: true },
      },
    );

    if (!workoutExercise || workoutExercise.workout.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return this.prismaService.workoutSet.create({
      data: { ...data, workoutExerciseId },
    });
  }

  async updateWorkoutSet(
    id: number,
    userId: number,
    data: UpdateWorkoutSetDto,
  ) {
    const workoutSet = await this.prismaService.workoutSet.findUnique({
      where: { id },
      include: {
        workoutExercise: {
          include: { workout: true },
        },
      },
    });

    if (!workoutSet || workoutSet.workoutExercise.workout.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    const updateData: { [key: string]: any } = { ...data };

    if (data.completed) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }

    delete updateData.completed;

    return this.prismaService.workoutSet.update({
      where: { id },
      data: updateData,
    });
  }
}
