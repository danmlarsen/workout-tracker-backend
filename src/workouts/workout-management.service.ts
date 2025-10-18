import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkoutManagementService {
  constructor(private readonly prismaService: PrismaService) {}

  async getWorkout(
    userId: number,
    options?: { id?: number; active?: boolean },
  ) {
    const whereClause: Prisma.WorkoutWhereInput = {
      userId,
      id: options?.id,
      status: options?.active ? 'ACTIVE' : undefined,
    };

    return this.prismaService.workout.findFirst({
      where: whereClause,
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
      orderBy: { startedAt: 'desc' },
    });
  }

  async updateWorkout(id: number, userId: number, data: UpdateWorkoutDto) {
    const workout = await this.getWorkout(userId, { id });

    if (!workout) throw new ForbiddenException('Not allowed');

    return this.prismaService.workout.update({
      where: { id, userId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteWorkout(id: number, userId: number) {
    return this.prismaService.workout.delete({ where: { id, userId } });
  }

  async createWorkoutDraft(userId: number) {
    return this.prismaService.workout.create({
      data: { userId, status: 'DRAFT' },
    });
  }

  async createActiveWorkout(userId: number) {
    const foundWorkout = await this.getWorkout(userId, { active: true });
    if (foundWorkout)
      throw new ConflictException('Already have an active workout');

    return this.prismaService.workout.create({
      data: { userId, status: 'ACTIVE' },
    });
  }

  async completeWorkout(userId: number, workoutId: number) {
    const workout = await this.prismaService.workout.findFirst({
      where: { id: workoutId, userId, status: 'ACTIVE' },
    });

    if (!workout) throw new ForbiddenException('Not allowed');

    const now = new Date();

    const activeDuration = Math.floor(
      new Date(
        now.getTime() - workout.startedAt.getTime() - workout.pauseDuration,
      ).getTime() / 1000,
    );

    return this.prismaService.workout.update({
      where: { id: workoutId },
      data: { status: 'COMPLETED', updatedAt: now, activeDuration },
    });
  }

  async deleteActiveWorkout(userId: number) {
    const workout = await this.getWorkout(userId, { active: true });

    if (!workout) throw new ForbiddenException('Not allowed');

    return this.prismaService.workout.delete({ where: { id: workout.id } });
  }

  async pauseActiveWorkout(userId: number) {
    const workout = await this.getWorkout(userId, { active: true });

    if (!workout) throw new ForbiddenException('Not allowed');

    if (workout.isPaused) {
      throw new BadRequestException('Workout is already paused');
    }

    return this.prismaService.workout.update({
      where: { id: workout.id },
      data: { isPaused: true, lastPauseStartTime: new Date() },
    });
  }

  async resumeActiveWorkout(userId: number) {
    const workout = await this.getWorkout(userId, { active: true });

    if (!workout) throw new ForbiddenException('Not allowed');

    if (!workout.isPaused || !workout.lastPauseStartTime) {
      throw new BadRequestException('Workout is not currently paused');
    }

    const now = new Date();
    const lastPauseStartTime = new Date(workout.lastPauseStartTime);
    const lastPauseDuration = Math.max(
      0,
      now.getTime() - lastPauseStartTime.getTime(),
    );

    return this.prismaService.workout.update({
      where: { id: workout.id },
      data: {
        isPaused: false,
        lastPauseStartTime: null,
        pauseDuration: (workout.pauseDuration || 0) + lastPauseDuration,
      },
    });
  }
}
