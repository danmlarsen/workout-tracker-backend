import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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
          orderBy: { exerciseOrder: 'asc' },
          include: {
            exercise: true,
            workoutSets: { orderBy: { setNumber: 'asc' } },
            previousWorkoutExercise: {
              include: {
                workoutSets: {
                  where: { completedAt: { not: null } },
                  orderBy: { setNumber: 'asc' },
                },
              },
            },
          },
        },
      },
    });
  }

  async getCompletedWorkouts(
    userId: number,
    options?: {
      cursor?: number;
      date?: string;
    },
  ) {
    const WORKOUT_LIMIT = 10;

    const whereClause = {
      userId,
      completedAt: { not: null },
      createdAt: {},
    };

    if (options?.date) {
      const targetDate = new Date(options.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const workouts = await this.prismaService.workout.findMany({
      where: whereClause,
      take: WORKOUT_LIMIT + 1,
      orderBy: { completedAt: 'desc' },
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: {
        workoutExercises: {
          orderBy: { exerciseOrder: 'asc' },
          include: {
            exercise: true,
            workoutSets: { orderBy: { setNumber: 'asc' } },
            previousWorkoutExercise: {
              include: {
                workoutSets: {
                  where: { completedAt: { not: null } },
                  orderBy: { setNumber: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    const hasMore = workouts.length > WORKOUT_LIMIT;
    const results = workouts.slice(0, WORKOUT_LIMIT);
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    return {
      results,
      nextCursor,
    };
  }

  async getCompletedWorkoutsCount(userId: number) {
    return this.prismaService.workout.count({
      where: { userId, completedAt: { not: null } },
    });
  }

  async getActiveWorkout(userId: number) {
    return this.prismaService.workout.findFirst({
      where: { userId, completedAt: null },
      include: {
        workoutExercises: {
          orderBy: { exerciseOrder: 'asc' },
          include: {
            exercise: true,
            workoutSets: { orderBy: { setNumber: 'asc' } },
            previousWorkoutExercise: {
              include: {
                workoutSets: {
                  where: { completedAt: { not: null } },
                  orderBy: { setNumber: 'asc' },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createActiveWorkout(userId: number) {
    const foundWorkout = await this.getActiveWorkout(userId);
    if (foundWorkout)
      throw new ConflictException('Already have an active workout');

    const today = new Date();
    const dayTitle = today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
    const title = `${dayTitle} Workout`;

    return this.prismaService.workout.create({
      data: { title, userId },
    });
  }

  async completeWorkout(userId: number, workoutId: number) {
    const workout = await this.prismaService.workout.findFirst({
      where: { id: workoutId, userId, completedAt: null },
    });

    if (!workout) throw new ForbiddenException('Not allowed');

    const now = new Date();

    return this.prismaService.workout.update({
      where: { id: workoutId },
      data: { completedAt: now, updatedAt: now },
    });
  }

  async deleteActiveWorkout(userId: number) {
    const workout = await this.getActiveWorkout(userId);

    if (!workout) throw new ForbiddenException('Not allowed');

    return this.prismaService.workout.delete({ where: { id: workout.id } });
  }

  async updateWorkout(id: number, userId: number, data: UpdateWorkoutDto) {
    return this.prismaService.workout.update({
      where: { id, userId },
      data: { ...data, updatedAt: new Date() },
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

    const maxSetNumber: { _max: { setNumber: number | null } } =
      await this.prismaService.workoutSet.aggregate({
        where: { workoutExerciseId },
        _max: { setNumber: true },
      });

    const nextSetNumber = (maxSetNumber._max.setNumber ?? 0) + 1;

    return this.prismaService.workoutSet.create({
      data: { ...data, workoutExerciseId, setNumber: nextSetNumber },
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

    return this.prismaService.workoutSet.update({
      where: { id },
      data: { ...updateData, updatedAt: new Date() },
    });
  }

  async getWorkoutStats(userId: number) {
    const [totalWorkouts, hoursResult, weightResult] = await Promise.all([
      // Total workouts count
      this.prismaService.workout.count({
        where: {
          userId,
          completedAt: { not: null },
        },
      }),

      // Total workout hours
      this.prismaService.$queryRaw<[{ total_hours: number }]>`
      SELECT 
        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600
          ), 
          0
        ) as total_hours
      FROM "Workout" 
      WHERE "userId" = ${userId} 
        AND "completedAt" IS NOT NULL 
        AND "createdAt" IS NOT NULL
    `,

      // Total weight lifted
      this.prismaService.$queryRaw<[{ total_weight: number }]>`
      SELECT 
        COALESCE(
          SUM(ws.weight * ws.reps), 
          0
        ) as total_weight
      FROM "WorkoutSet" ws
      INNER JOIN "WorkoutExercise" we ON ws."workoutExerciseId" = we.id
      INNER JOIN "Workout" w ON we."workoutId" = w.id
      WHERE w."userId" = ${userId}
        AND w."completedAt" IS NOT NULL
        AND ws."completedAt" IS NOT NULL
        AND ws.weight IS NOT NULL
        AND ws.reps IS NOT NULL
    `,
    ]);

    return {
      totalWorkouts,
      totalHours: Math.round((hoursResult[0]?.total_hours || 0) * 100) / 100,
      totalWeightLifted:
        Math.round((weightResult[0]?.total_weight || 0) * 100) / 100,
    };
  }

  async getWorkoutCalendar(userId: number, year: number) {
    const workouts = await this.prismaService.$queryRaw<
      Array<{ id: number; completedAt: Date }>
    >`
    SELECT id, "completedAt"
    FROM "Workout"
    WHERE "userId" = ${userId}
      AND "completedAt" IS NOT NULL
      AND EXTRACT(YEAR FROM "completedAt") = ${year}
    ORDER BY "completedAt" ASC
  `;

    return {
      workoutDates: workouts.map(
        (workout) => workout.completedAt.toISOString().split('T')[0],
      ),
      totalWorkouts: workouts.length,
    };
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
          completedAt: { not: null },
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
