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
      from?: Date;
      to?: Date;
    },
  ) {
    const WORKOUT_LIMIT = 10;

    const whereClause: Prisma.WorkoutWhereInput = {
      userId,
      status: 'COMPLETED',
      startedAt: {
        gte: options?.from ? options.from : undefined,
        lte: options?.to ? options.to : undefined,
      },
    };

    const workouts = await this.prismaService.workout.findMany({
      where: whereClause,
      take: WORKOUT_LIMIT + 1,
      orderBy: { startedAt: 'desc' },
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
          SUM("activeDuration") / 3600.0,
          0
        ) as total_hours
      FROM "Workout" 
      WHERE "userId" = ${userId} 
        AND "status" = 'COMPLETED'
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
      Array<{ id: number; startedAt: Date }>
    >`
    SELECT id, "startedAt"
    FROM "Workout"
    WHERE "userId" = ${userId}
      AND "status" = 'COMPLETED' 
      AND EXTRACT(YEAR FROM "startedAt") = ${year}
    ORDER BY "startedAt" ASC
  `;

    return {
      workoutDates: workouts.map((workout) => workout.startedAt),
      totalWorkouts: workouts.length,
    };
  }
}
