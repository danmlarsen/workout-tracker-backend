import { Injectable } from '@nestjs/common';
import { Prisma, WorkoutSet } from '@prisma/client';
import { calculateOneRepMax } from 'src/common/utils';
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
            exercise: { select: { name: true, category: true } },
            workoutSets: {
              select: {
                type: true,
                reps: true,
                weight: true,
                duration: true,
                completedAt: true,
              },
              orderBy: [{ setNumber: 'asc' }, { updatedAt: 'desc' }],
            },
          },
        },
      },
    });

    const hasMore = workouts.length > WORKOUT_LIMIT;
    const rawResults = workouts.slice(0, WORKOUT_LIMIT);
    const nextCursor = hasMore ? rawResults[rawResults.length - 1].id : null;

    const transformedResults = rawResults.map((workout) => {
      const totalWeight = workout.workoutExercises.reduce(
        (total, exercise) =>
          total +
          exercise.workoutSets.reduce(
            (setTotal, curSet) =>
              setTotal +
              (curSet.completedAt
                ? (curSet.weight ?? 0) * (curSet.reps ?? 0)
                : 0),
            0,
          ),
        0,
      );

      const totalCompletedSets = workout.workoutExercises.reduce(
        (total, exercise) =>
          total +
          exercise.workoutSets?.filter((set) => !!set.completedAt)?.length,
        0,
      );

      const compressedWorkoutExercises = workout.workoutExercises.map(
        (workoutExercise) => {
          const completedSets = workoutExercise.workoutSets.reduce(
            (sum, set) => (set.completedAt ? sum + 1 : sum),
            0,
          );

          let bestSet: Partial<WorkoutSet | null> = null;
          if (workoutExercise.exercise.category === 'strength') {
            bestSet = workoutExercise.workoutSets.reduce((best, current) => {
              const currentOneRM = calculateOneRepMax(
                current.weight!,
                current.reps!,
              );
              const bestOneRM = calculateOneRepMax(best.weight!, best.reps!);
              return currentOneRM > bestOneRM ? current : best;
            });
          }
          if (workoutExercise.exercise.category === 'cardio') {
            bestSet = workoutExercise.workoutSets.reduce((best, current) =>
              current.duration! > best.duration! ? current : best,
            );
          }

          return {
            exerciseName: workoutExercise.exercise.name,
            sets: completedSets,
            bestSet,
          };
        },
      );

      return {
        ...workout,
        totalWeight,
        totalCompletedSets,
        workoutExercises: compressedWorkoutExercises.filter(
          (we) => we.sets > 0,
        ),
      };
    });

    return {
      results: transformedResults,
      nextCursor,
    };
  }

  async getCompletedWorkoutsCount(userId: number) {
    return this.prismaService.workout.count({
      where: { userId, status: 'COMPLETED' },
    });
  }

  async getWorkoutStats(
    userId: number,
    options?: {
      from?: Date;
      to?: Date;
    },
  ) {
    const whereClause: Prisma.WorkoutWhereInput = {
      userId,
      status: 'COMPLETED',
      startedAt: {
        gte: options?.from ? options.from : undefined,
        lte: options?.to ? options.to : undefined,
      },
    };

    const [totalWorkouts, hoursResult, weightResult] = await Promise.all([
      // Total workouts count
      this.prismaService.workout.count({
        where: whereClause,
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
        ${options?.from ? Prisma.sql`AND "startedAt" >= ${options.from}` : Prisma.empty}
        ${options?.to ? Prisma.sql`AND "startedAt" <= ${options.to}` : Prisma.empty}
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
        ${options?.from ? Prisma.sql`AND w."startedAt" >= ${options.from}` : Prisma.empty}
        ${options?.to ? Prisma.sql`AND w."startedAt" <= ${options.to}` : Prisma.empty}
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
