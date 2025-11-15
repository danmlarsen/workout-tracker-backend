import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutExerciseDto } from './dtos/create-workout-exercise.dto';
import { UpdateWorkoutExerciseDto } from './dtos/update-workout-exercise.dto';
import { FULL_WORKOUT_INCLUDE } from './const/full-workout-include';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class WorkoutExerciseService {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectPinoLogger(WorkoutExerciseService.name)
    private readonly logger: PinoLogger,
  ) {}

  async createWorkoutExercise(
    userId: number,
    workoutId: number,
    data: CreateWorkoutExerciseDto,
  ) {
    this.logger.info(`Creating workout exercise`, { userId, workoutId, data });

    try {
      const workout = await this.prismaService.workout.findFirst({
        where: { id: workoutId, userId },
      });

      if (!workout) {
        this.logger.warn(
          `User tried to create workout exercise for a workout that does not exist or they do not own`,
          { userId, workoutId },
        );
        throw new ForbiddenException('Not allowed');
      }

      const maxOrder: { _max: { exerciseOrder: number | null } } =
        await this.prismaService.workoutExercise.aggregate({
          where: { workoutId },
          _max: { exerciseOrder: true },
        });

      const nextOrder = (maxOrder._max.exerciseOrder ?? 0) + 1;

      const previousWorkoutExercise = await this.findPreviousWorkoutExercise(
        userId,
        data.exerciseId,
        workout.startedAt,
      );

      // Create sets based on previous structure or default to single set
      const setsToCreate =
        previousWorkoutExercise &&
        previousWorkoutExercise.workoutSets.length > 0
          ? previousWorkoutExercise.workoutSets.map((_, index) => ({
              setNumber: index + 1,
            }))
          : [{ setNumber: 1 }];

      return this.prismaService.workout.update({
        where: { id: workoutId },
        data: {
          workoutExercises: {
            create: {
              exerciseId: data.exerciseId,
              exerciseOrder: nextOrder,
              previousWorkoutExerciseId: previousWorkoutExercise?.id,
              workoutSets: {
                create: setsToCreate,
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
      this.logger.error(`Failed to create workout exercise`, {
        userId,
        workoutId,
        data,
        error,
      });
      throw new InternalServerErrorException(
        'Failed to create workout exercise',
      );
    }
  }

  async updateWorkoutExercise(
    userId: number,
    id: number,
    data: UpdateWorkoutExerciseDto,
  ) {
    this.logger.info(`Updating workout exercise`, { userId, id, data });

    try {
      const workoutExercise =
        await this.prismaService.workoutExercise.findUnique({
          where: { id },
          include: {
            workout: true,
          },
        });

      if (!workoutExercise || workoutExercise.workout.userId !== userId) {
        this.logger.warn(
          `User tried to update a workout exercise that does not exist or they do not own`,
          {
            userId,
            id,
          },
        );
        throw new ForbiddenException('Not allowed');
      }

      return this.prismaService.workout.update({
        where: { id: workoutExercise.workoutId },
        data: {
          workoutExercises: {
            update: {
              where: { id },
              data,
            },
          },
        },
        include: FULL_WORKOUT_INCLUDE,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to update workout exercise`, {
        userId,
        id,
        data,
        error,
      });
      throw new InternalServerErrorException(
        'Failed to update workout exercise',
      );
    }
  }

  async deleteWorkoutExercise(userId: number, id: number) {
    this.logger.info(`Deleting workout exercise`, { userId, id });

    try {
      const workoutExercise =
        await this.prismaService.workoutExercise.findUnique({
          where: { id },
          include: {
            workout: true,
          },
        });

      if (!workoutExercise || workoutExercise.workout.userId !== userId) {
        this.logger.warn(
          `User tried to delete a workout exercise that does not exist or they do not own`,
          {
            userId,
            id,
          },
        );
        throw new ForbiddenException('Not allowed');
      }

      return this.prismaService.workout.update({
        where: { id: workoutExercise.workoutId },
        data: {
          workoutExercises: {
            delete: { id },
          },
        },
        include: FULL_WORKOUT_INCLUDE,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to delete workout exercise`, {
        userId,
        id,
        error,
      });
      throw new InternalServerErrorException(
        'Failed to delete workout exercise',
      );
    }
  }

  async getWorkoutExerciseSets(userId: number, id: number) {
    this.logger.info(`Getting workout exercise sets`, { userId, id });

    try {
      const workoutExercise =
        await this.prismaService.workoutExercise.findUnique({
          where: { id },
          include: {
            workout: true,
            workoutSets: true,
            exercise: true,
          },
        });

      if (!workoutExercise || workoutExercise.workout.userId !== userId) {
        this.logger.warn(
          `User tried to get workout exercise sets for an exercise that does not exist or they do not own`,
          {
            userId,
            id,
          },
        );
        throw new ForbiddenException('Not allowed');
      }

      return workoutExercise;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to get workout exercise sets`, {
        userId,
        id,
        error,
      });
      throw new InternalServerErrorException(
        'Failed to get workout exercise sets',
      );
    }
  }

  private async findPreviousWorkoutExercise(
    userId: number,
    exerciseId: number,
    currentWorkoutStartedAt: Date,
  ): Promise<{ id: number; workoutSets: { setNumber: number }[] } | null> {
    return this.prismaService.workoutExercise.findFirst({
      where: {
        exerciseId,
        workout: {
          userId,
          status: 'COMPLETED',
          startedAt: {
            lt: currentWorkoutStartedAt,
          },
        },
      },
      include: {
        workoutSets: {
          where: { completed: true },
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
