import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { UpdateExerciseDto } from './dtos/update-exercise.dto';
import { SYSTEM_USER_ID } from 'src/common/constants';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly prismaService: PrismaService,
    @InjectPinoLogger(ExercisesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async createExercise(userId: number | null, data: CreateExerciseDto) {
    this.logger.info(`Creating exercise for user ${userId}`, { userId, data });

    try {
      const foundExercise = await this.prismaService.exercise.findFirst({
        where: {
          name: data.name,
          userId: userId,
          equipment: data.equipment,
        },
      });

      if (foundExercise) {
        this.logger.warn(`User tried to create a duplicate exercise`, {
          userId,
          data,
        });
        throw new ConflictException('Exercise already exists');
      }

      const newExercise = await this.prismaService.exercise.create({
        data: { ...data, userId },
      });
      return newExercise;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to create exercise for user`, {
        userId,
        data,
        error,
      });
      throw new InternalServerErrorException('Failed to create exercise');
    }
  }

  async findAllExercises(
    userId: number,
    options?: {
      cursor?: number;
      filters?: {
        name?: string;
        targetMuscleGroups?: string[];
        equipment?: string[];
      };
    },
  ) {
    const EXERCISE_LIMIT = 20;

    this.logger.info(`Fetching exercises`, { userId, options });

    try {
      const exercises = await this.prismaService.exercise.findMany({
        where: {
          AND: [
            { OR: [{ userId }, { userId: SYSTEM_USER_ID }] },
            // Name filter - case insensitive partial match
            ...(options?.filters?.name
              ? [
                  {
                    name: {
                      contains: options.filters.name,
                      mode: 'insensitive' as const,
                    },
                  },
                ]
              : []),
            // Muscle groups filter - array contains any of the specified groups
            ...(options?.filters?.targetMuscleGroups?.length
              ? [
                  {
                    targetMuscleGroups: {
                      hasSome: options.filters.targetMuscleGroups,
                    },
                  },
                ]
              : []),
            // Equipment filter - matches any of the specified equipment
            ...(options?.filters?.equipment?.length
              ? [
                  {
                    equipment: {
                      in: options.filters.equipment,
                    },
                  },
                ]
              : []),
          ],
        },
        take: EXERCISE_LIMIT + 1,
        ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              workoutExercises: {
                where: {
                  workout: {
                    userId: userId,
                  },
                },
              },
            },
          },
        },
      });

      const exercisesWithTimesUsed = exercises.map(
        ({ _count, ...exercise }) => ({
          ...exercise,
          timesUsed: _count.workoutExercises,
        }),
      );

      const hasNextPage = exercisesWithTimesUsed.length > EXERCISE_LIMIT;
      const results = exercisesWithTimesUsed.slice(0, EXERCISE_LIMIT);
      const nextCursor = hasNextPage ? results[results.length - 1].id : null;

      return {
        success: true,
        meta: {
          hasNextPage,
          nextCursor,
        },
        data: results,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch exercises for user`, {
        userId,
        options,
        error,
      });
      throw new InternalServerErrorException('Failed to fetch exercises');
    }
  }

  async findExerciseById(userId: number, exerciseId: number) {
    this.logger.info(`Fetching exercise by id`, { userId, exerciseId });
    try {
      const exercise = await this.prismaService.exercise.findFirst({
        where: {
          AND: [
            { id: exerciseId },
            { OR: [{ userId }, { userId: SYSTEM_USER_ID }] },
          ],
        },
        include: {
          _count: {
            select: {
              workoutExercises: {
                where: {
                  workout: {
                    userId: userId,
                  },
                },
              },
            },
          },
        },
      });

      if (!exercise) {
        this.logger.warn(`No exercise found with this id`, {
          userId,
          exerciseId,
        });
        throw new NotFoundException('found no exercise with this id');
      }

      const { _count, ...filteredExercise } = exercise;

      return {
        ...filteredExercise,
        timesUsed: _count.workoutExercises,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to fetch exercise for user`, {
        userId,
        exerciseId,
        error,
      });
      throw new InternalServerErrorException('Failed to fetch exercise');
    }
  }

  async updateExercise(
    userId: number,
    exerciseId: number,
    data: UpdateExerciseDto,
  ) {
    this.logger.info(`Updating exercise`, { userId, exerciseId, data });

    try {
      const exercise = await this.prismaService.exercise.findFirst({
        where: { AND: [{ id: exerciseId }, { userId }] },
      });

      if (!exercise) throw new NotFoundException('exercise not found');

      return this.prismaService.exercise.update({
        where: { id: exerciseId },
        data,
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to update exercise for user`, {
        userId,
        exerciseId,
        data,
        error,
      });
      throw new InternalServerErrorException('Failed to update exercise');
    }
  }

  async deleteExercise(userId: number, exerciseId: number) {
    this.logger.info(`Deleting exercise`, { userId, exerciseId });

    try {
      const exercise = await this.prismaService.exercise.findFirst({
        where: { AND: [{ id: exerciseId }, { userId }] },
      });

      if (!exercise) throw new NotFoundException('Exercise not found');

      return this.prismaService.exercise.delete({
        where: { id: exerciseId },
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to delete exercise for user`, {
        userId,
        exerciseId,
        error,
      });
      throw new InternalServerErrorException('Failed to delete exercise');
    }
  }

  async getExerciseWorkouts(
    userId: number,
    exerciseId: number,
    options?: { cursor?: number },
  ) {
    const WORKOUT_LIMIT = 10;

    this.logger.info(`Fetching workouts for exercise`, {
      userId,
      exerciseId,
      options,
    });

    try {
      const workouts = await this.prismaService.workout.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          workoutExercises: {
            some: {
              exerciseId,
            },
          },
        },
        take: WORKOUT_LIMIT + 1,
        ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
        include: {
          workoutExercises: {
            where: { exerciseId },
            include: {
              workoutSets: {
                where: { completed: true },
                orderBy: { setNumber: 'asc' },
              },
            },
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      const hasNextPage = workouts.length > WORKOUT_LIMIT;
      const results = workouts.slice(0, WORKOUT_LIMIT);
      const nextCursor =
        hasNextPage && results.length > 0
          ? results[results.length - 1]?.id
          : null;

      const flattenedWorkouts = results.map(
        ({ workoutExercises, ...workout }) => ({
          ...workout,
          workoutSets: workoutExercises[0].workoutSets || [],
        }),
      );

      return {
        success: true,
        meta: {
          hasNextPage,
          nextCursor,
        },
        data: flattenedWorkouts,
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to fetch workouts for exercise`, {
        userId,
        exerciseId,
        options,
        error,
      });
      throw new InternalServerErrorException(
        'Failed to fetch workouts for exercise',
      );
    }
  }
}
