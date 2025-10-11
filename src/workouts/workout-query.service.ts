import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WorkoutQueryService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCompletedWorkouts(
    userId: number,
    options?: {
      cursor?: number;
      date?: string;
    },
  ) {
    const WORKOUT_LIMIT = 10;

    const whereClause: Prisma.WorkoutWhereInput = {
      userId,
      status: 'COMPLETED',
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
      where: { userId, status: 'COMPLETED' },
    });
  }

  async getWorkoutStats(userId: number) {
    const [totalWorkouts, hoursResult, weightResult] = await Promise.all([
      // Total workouts count
      this.prismaService.workout.count({
        where: {
          userId,
          status: 'COMPLETED',
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
        AND "status" = 'COMPLETED'
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
        AND w."status" = 'COMPLETED'
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
      Array<{ id: number; createdAt: Date }>
    >`
    SELECT id, "createdAt"
    FROM "Workout"
    WHERE "userId" = ${userId}
      AND "createdAt" IS NOT NULL
      AND EXTRACT(YEAR FROM "createdAt") = ${year}
    ORDER BY "createdAt" ASC
  `;

    return {
      workoutDates: workouts.map(
        (workout) => workout.createdAt.toISOString().split('T')[0],
      ),
      totalWorkouts: workouts.length,
    };
  }
}
