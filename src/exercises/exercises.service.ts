import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';
import { UpdateExerciseDto } from './dtos/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prismaService: PrismaService) {}

  createExercise(userId: number | null, data: CreateExerciseDto) {
    return this.prismaService.exercise.create({ data: { ...data, userId } });
  }

  async findAllExercises(userId: number) {
    const exercises = await this.prismaService.exercise.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
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

    return exercises.map(({ _count, ...exercise }) => ({
      ...exercise,
      timesUsed: _count.workoutExercises,
    }));
  }

  async findExerciseById(userId: number, exerciseId: number) {
    const exercise = await this.prismaService.exercise.findFirst({
      where: {
        AND: [{ id: exerciseId }, { OR: [{ userId }, { userId: null }] }],
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

    if (!exercise)
      throw new NotFoundException('found no exercise with this id');

    const { _count, ...filteredExercise } = exercise;

    return {
      ...filteredExercise,
      timesUsed: _count.workoutExercises,
    };
  }

  async updateExercise(
    userId: number,
    exerciseId: number,
    data: UpdateExerciseDto,
  ) {
    const exercise = await this.prismaService.exercise.findFirst({
      where: { AND: [{ id: exerciseId }, { userId }] },
    });

    if (!exercise) throw new NotFoundException('exercise not found');

    return this.prismaService.exercise.update({
      where: { id: exerciseId },
      data,
    });
  }

  async deleteExercise(userId: number, exerciseId: number) {
    const exercise = await this.prismaService.exercise.findFirst({
      where: { AND: [{ id: exerciseId }, { userId }] },
    });

    if (!exercise) throw new NotFoundException('exercise not found');

    return this.prismaService.exercise.delete({
      where: { id: exerciseId },
    });
  }

  async getExerciseWorkouts(
    userId: number,
    exerciseId: number,
    options?: { cursor?: number },
  ) {
    const WORKOUT_LIMIT = 10;

    const workouts = await this.prismaService.workout.findMany({
      where: {
        userId,
        completedAt: { not: null },
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
          select: {
            workoutSets: {
              where: { completedAt: { not: null } },
              orderBy: { setNumber: 'asc' },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const hasMore = workouts.length > WORKOUT_LIMIT;
    const results = workouts.slice(0, WORKOUT_LIMIT);
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    const flattenedWorkouts = workouts.map(
      ({ workoutExercises, ...workout }) => ({
        ...workout,
        workoutSets: workoutExercises[0]?.workoutSets || [],
      }),
    );

    return {
      results: flattenedWorkouts,
      nextCursor,
    };
  }
}
