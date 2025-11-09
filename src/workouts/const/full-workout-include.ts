import { Prisma } from '@prisma/client';

export const FULL_WORKOUT_INCLUDE: Prisma.WorkoutInclude = {
  workoutExercises: {
    orderBy: { exerciseOrder: 'asc' },
    include: {
      exercise: true,
      workoutSets: {
        orderBy: [{ setNumber: 'asc' }, { updatedAt: 'asc' }],
      },
      previousWorkoutExercise: {
        include: {
          workoutSets: {
            where: { completed: true },
            orderBy: { setNumber: 'asc' },
          },
        },
      },
    },
  },
} as const;
