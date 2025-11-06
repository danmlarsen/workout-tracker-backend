import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';
import { WorkoutSetType } from './types/workout.types';
import { WorkoutManagementService } from './workout-management.service';

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

    await this.prismaService.workoutSet.create({
      data: { ...data, workoutExerciseId, setNumber: nextSetNumber },
    });

    return this.workoutService.getWorkout(userId, {
      id: workoutExercise.workoutId,
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

    await this.prismaService.$transaction(async (tx) => {
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

      return tx.workoutSet.update({
        where: { id },
        data: { ...updateData },
      });
    });

    return this.workoutService.getWorkout(userId, {
      id: workoutSet.workoutExercise.workoutId,
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

    await this.prismaService.$transaction(async (tx) => {
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

      return tx.workoutSet.delete({
        where: { id },
      });
    });

    return this.workoutService.getWorkout(userId, {
      id: workoutSet.workoutExercise.workoutId,
    });
  }
}
