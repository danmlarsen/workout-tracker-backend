import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { UpdateWorkoutExerciseDto } from './dtos/update-workout-exercise.dto';
import { WorkoutManagementService } from './workout-management.service';

@Injectable()
export class WorkoutExerciseService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly workoutService: WorkoutManagementService,
  ) {}

  async createWorkoutExercise(
    userId: number,
    workoutId: number,
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

    await this.prismaService.workoutExercise.create({
      data: {
        workoutId,
        exerciseId: data.exerciseId,
        exerciseOrder: nextOrder,
        previousWorkoutExerciseId: previousWorkoutExercise?.id,
        workoutSets: {
          create: setsToCreate,
        },
      },
    });

    return this.workoutService.getWorkout(userId, {
      id: workout.id,
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

    await this.prismaService.workoutExercise.update({
      where: { id },
      data,
    });

    return this.workoutService.getWorkout(userId, {
      id: workoutExercise.workoutId,
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

    await this.prismaService.workoutExercise.delete({
      where: { id },
    });

    return this.workoutService.getWorkout(userId, {
      id: workoutExercise.workoutId,
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
          startedAt: 'desc',
        },
      },
    });
  }
}
