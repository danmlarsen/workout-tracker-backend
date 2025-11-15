import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';
import { FULL_WORKOUT_INCLUDE } from './const/full-workout-include';
import { InjectPinoLogger } from 'nestjs-pino/InjectPinoLogger';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class WorkoutSetService {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectPinoLogger(WorkoutSetService.name)
    private readonly logger: PinoLogger,
  ) {}

  async createWorkoutSet(
    workoutExerciseId: number,
    userId: number,
    data: CreateWorkoutSetDto,
  ) {
    this.logger.info(`Creating workout set`, {
      workoutExerciseId,
      userId,
      data,
    });
    try {
      const workoutExercise =
        await this.prismaService.workoutExercise.findUnique({
          where: { id: workoutExerciseId },
          include: { workout: true },
        });

      if (!workoutExercise || workoutExercise.workout.userId !== userId) {
        this.logger.warn(
          `User tried to create workout set for a workout exercise that does not exist or they do not own`,
          {
            workoutExerciseId,
            userId,
          },
        );
        throw new ForbiddenException('Not allowed');
      }

      return await this.prismaService.$transaction(async (tx) => {
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
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to create workout set`, {
        workoutExerciseId,
        userId,
        data,
        error,
      });
      throw new InternalServerErrorException('Failed to create workout set');
    }
  }

  async updateWorkoutSet(
    id: number,
    userId: number,
    data: UpdateWorkoutSetDto,
  ) {
    this.logger.info(`Updating workout set`, { id, userId, data });
    try {
      const workoutSet = await this.prismaService.workoutSet.findUnique({
        where: { id },
        include: {
          workoutExercise: {
            include: { workout: true },
          },
        },
      });

      if (!workoutSet || workoutSet.workoutExercise.workout.userId !== userId) {
        this.logger.warn(
          `User tried to update a workout set that does not exist or they do not own`,
          {
            id,
            userId,
          },
        );
        throw new ForbiddenException('Not allowed');
      }

      return await this.prismaService.workout.update({
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
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to update workout set`, {
        id,
        userId,
        data,
        error,
      });
      throw new InternalServerErrorException('Failed to update workout set');
    }
  }

  async deleteWorkoutSet(id: number, userId: number) {
    this.logger.info(`Deleting workout set`, { id, userId });
    try {
      const workoutSet = await this.prismaService.workoutSet.findUnique({
        where: { id },
        include: {
          workoutExercise: {
            include: { workout: true },
          },
        },
      });

      if (!workoutSet || workoutSet.workoutExercise.workout.userId !== userId) {
        this.logger.warn(
          `User tried to delete a workout set that does not exist or they do not own`,
          {
            id,
            userId,
          },
        );
        throw new ForbiddenException('Not allowed');
      }

      return await this.prismaService.$transaction(async (tx) => {
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
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to delete workout set`, { id, userId, error });
      throw new InternalServerErrorException('Failed to delete workout set');
    }
  }
}
