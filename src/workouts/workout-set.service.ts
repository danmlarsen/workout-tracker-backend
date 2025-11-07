import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';
import { WorkoutSetType } from './types/workout.types';
import { WorkoutManagementService } from './workout-management.service';
import { FULL_WORKOUT_INCLUDE } from './const/full-workout-include';

@Injectable()
export class WorkoutSetService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly workoutService: WorkoutManagementService,
  ) {}

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

    const maxSetNumber: { _max: { setNumber: number | null } } =
      await this.prismaService.workoutSet.aggregate({
        where: { workoutExerciseId },
        _max: { setNumber: true },
      });

    const nextSetNumber = (maxSetNumber._max.setNumber ?? 0) + 1;

    return this.prismaService.$transaction(async (tx) => {
      await tx.workoutSet.create({
        data: { ...data, workoutExerciseId, setNumber: nextSetNumber },
      });

      return tx.workout.findUnique({
        where: { id: workoutExercise.workoutId },
        include: FULL_WORKOUT_INCLUDE,
      });
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
    }
    if (data.completed === false) {
      updateData.completedAt = null;
    }
    delete updateData.completed;

    return this.prismaService.$transaction(async (tx) => {
      // Converting normal set to warmup
      if (
        workoutSet.type !== WorkoutSetType.WARMUP.toString() &&
        data.type === WorkoutSetType.WARMUP
      ) {
        // Shift down all sets that were after this one
        await tx.workoutSet.updateMany({
          where: {
            workoutExerciseId: workoutSet.workoutExerciseId,
            setNumber: {
              gt: workoutSet.setNumber,
            },
          },
          data: {
            setNumber: {
              decrement: 1,
            },
          },
        });

        updateData.type = WorkoutSetType.WARMUP;
        updateData.setNumber = 0;
      }

      // Converting warmup set to normal
      if (
        workoutSet.type === WorkoutSetType.WARMUP.toString() &&
        !!data.type &&
        data.type !== WorkoutSetType.WARMUP
      ) {
        // Shift up all normal sets to make room at position 1
        await tx.workoutSet.updateMany({
          where: {
            workoutExerciseId: workoutSet.workoutExerciseId,
            setNumber: {
              gte: 1,
            },
          },
          data: {
            setNumber: {
              increment: 1,
            },
          },
        });

        updateData.setNumber = 1;
      }

      await tx.workoutSet.update({
        where: { id },
        data: { ...updateData },
      });

      return tx.workout.findUnique({
        where: { id: workoutSet.workoutExercise.workoutId },
        include: FULL_WORKOUT_INCLUDE,
      });
    });
  }

  async deleteWorkoutSet(id: number, userId: number) {
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

    return this.prismaService.$transaction(async (tx) => {
      if (
        workoutSet.setNumber > 0 &&
        workoutSet.type !== WorkoutSetType.WARMUP.toString()
      ) {
        await tx.workoutSet.updateMany({
          where: {
            workoutExerciseId: workoutSet.workoutExerciseId,
            setNumber: {
              gt: workoutSet.setNumber,
            },
          },
          data: {
            setNumber: {
              decrement: 1,
            },
          },
        });
      }

      await tx.workoutSet.delete({
        where: { id },
      });

      return tx.workout.findUnique({
        where: { id: workoutSet.workoutExercise.workoutId },
        include: FULL_WORKOUT_INCLUDE,
      });
    });
  }
}
