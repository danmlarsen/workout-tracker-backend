import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { UpdateWorkoutExerciseDto } from './dtos/update-workout-exercise.dto';

@Injectable()
export class WorkoutExerciseService {
  constructor(private readonly prismaService: PrismaService) {}

  async createWorkoutExercise(
    workoutId: number,
    userId: number,
    data: CreateWorkoutExerciseDto,
  ) {
    const workout = await this.prismaService.workout.findFirst({
      where: { id: workoutId, userId },
    });

    if (!workout) throw new ForbiddenException('Not allowed');

    const maxOrder: { _max: { exerciseOrder: number | null } } =
      await this.prismaService.workoutExercise.aggregate({
        where: { workoutId },
        _max: { exerciseOrder: true },
      });

    const nextOrder = (maxOrder._max.exerciseOrder ?? 0) + 1;

    const previousWorkoutExercise = await this.findPreviousWorkoutExercise(
      userId,
      data.exerciseId,
    );

    // Create sets based on previous structure or default to single set
    const setsToCreate =
      previousWorkoutExercise && previousWorkoutExercise.workoutSets.length > 0
        ? previousWorkoutExercise.workoutSets.map((_, index) => ({
            setNumber: index + 1,
          }))
        : [{ setNumber: 1 }];

    return this.prismaService.workoutExercise.create({
      data: {
        workoutId,
        exerciseId: data.exerciseId,
        exerciseOrder: nextOrder,
        previousWorkoutExerciseId: previousWorkoutExercise?.id,
        workoutSets: {
          create: setsToCreate,
        },
      },
      include: {
        workoutSets: true,
      },
    });
  }

  async updateWorkoutExercise(
    userId: number,
    id: number,
    data: UpdateWorkoutExerciseDto,
  ) {
    const workoutExercise = await this.prismaService.workoutExercise.findUnique(
      {
        where: { id },
        include: {
          workout: true,
        },
      },
    );

    if (!workoutExercise || workoutExercise.workout.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return this.prismaService.workoutExercise.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteWorkoutExercise(userId: number, id: number) {
    const workoutExercise = await this.prismaService.workoutExercise.findUnique(
      {
        where: { id },
        include: {
          workout: true,
        },
      },
    );

    if (!workoutExercise || workoutExercise.workout.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return this.prismaService.workoutExercise.delete({
      where: { id },
    });
  }

  async getWorkoutExerciseSets(userId: number, id: number) {
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

    if (!workoutExercise || workoutExercise.workout.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }

    return workoutExercise;
  }

  private async findPreviousWorkoutExercise(
    userId: number,
    exerciseId: number,
  ): Promise<{ id: number; workoutSets: { setNumber: number }[] } | null> {
    return this.prismaService.workoutExercise.findFirst({
      where: {
        exerciseId,
        workout: {
          userId,
          status: 'COMPLETED',
        },
      },
      include: {
        workoutSets: {
          where: { completedAt: { not: null } },
          orderBy: { setNumber: 'asc' },
        },
      },
      orderBy: {
        workout: {
          completedAt: 'desc',
        },
      },
    });
  }
}
