import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';
import { FULL_WORKOUT_INCLUDE } from './const/full-workout-include';

@Injectable()
export class WorkoutSetService {
  constructor(private readonly prismaService: PrismaService) {}

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

    return this.prismaService.$transaction(async (tx) => {
      const maxSetNumber: { _max: { setNumber: number | null } } =
        await tx.workoutSet.aggregate({
          where: { workoutExerciseId },
          _max: { setNumber: true },
        });

      const nextSetNumber = (maxSetNumber._max.setNumber ?? 0) + 1;

      return tx.workout.update({
        where: { id: workoutExercise.workoutId },
        data: {
          workoutExercises: {
            update: {
              where: { id: workoutExerciseId },
              data: {
                workoutSets: {
                  create: {
                    ...data,
                    setNumber: nextSetNumber,
                  },
                },
              },
            },
          },
        },
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

    return this.prismaService.workout.update({
      where: { id: workoutSet.workoutExercise.workoutId },
      data: {
        workoutExercises: {
          update: {
            where: { id: workoutSet.workoutExerciseId },
            data: {
              workoutSets: {
                update: {
                  where: {
                    id,
                  },
                  data,
                },
              },
            },
          },
        },
      },
      include: FULL_WORKOUT_INCLUDE,
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

      return tx.workout.update({
        where: { id: workoutSet.workoutExercise.workoutId },
        data: {
          workoutExercises: {
            update: {
              where: { id: workoutSet.workoutExerciseId },
              data: {
                workoutSets: {
                  delete: { id },
                },
              },
            },
          },
        },
        include: FULL_WORKOUT_INCLUDE,
      });
    });
  }
}
