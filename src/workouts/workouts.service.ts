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
          include: {
            exercise: true,
            workoutSets: true,
          },
        },
      },
    });
  }

  async getCompletedWorkouts(
    userId: number,
    options?: {
      cursor?: number;
    },
  ) {
    const WORKOUT_LIMIT = 5;

    const workouts = await this.prismaService.workout.findMany({
      where: { userId, completedAt: { not: null } },
      take: WORKOUT_LIMIT + 1,
      orderBy: { completedAt: 'desc' },
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      include: {
        workoutExercises: {
          include: {
            exercise: true,
            workoutSets: true,
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

    return this.prismaService.workout.update({
      where: { id: workoutId },
      data: { completedAt: new Date() },
    });
  }

  async updateWorkout(id: number, userId: number, data: UpdateWorkoutDto) {
    return this.prismaService.workout.update({
      where: { id, userId },
      data,
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

    return this.prismaService.workoutExercise.create({
      data: {
        workoutId,
        exerciseId: data.exerciseId,
        exerciseOrder: nextOrder,
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
      data: updateData,
    });
  }
}
