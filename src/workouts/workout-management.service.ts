import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateWorkoutDto } from './dtos/update-workout.dto';

@Injectable()
export class WorkoutManagementService {
  constructor(private readonly prismaService: PrismaService) {}

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

  async updateWorkout(id: number, userId: number, data: UpdateWorkoutDto) {
    return this.prismaService.workout.update({
      where: { id, userId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteWorkout(id: number, userId: number) {
    return this.prismaService.workout.delete({ where: { id, userId } });
  }

  async getActiveWorkout(userId: number) {
    return this.prismaService.workout.findFirst({
      where: { userId, status: 'ACTIVE' },
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

  async createWorkoutDraft(userId: number) {
    return this.prismaService.workout.create({
      data: { userId, status: 'DRAFT' },
    });
  }

  async createActiveWorkout(userId: number) {
    const foundWorkout = await this.getActiveWorkout(userId);
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

    return this.prismaService.workout.update({
      where: { id: workoutId },
      data: { status: 'COMPLETED', completedAt: now, updatedAt: now },
    });
  }

  async deleteActiveWorkout(userId: number) {
    const workout = await this.getActiveWorkout(userId);

    if (!workout) throw new ForbiddenException('Not allowed');

    return this.prismaService.workout.delete({ where: { id: workout.id } });
  }

  async pauseActiveWorkout(userId: number) {
    const workout = await this.getActiveWorkout(userId);

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
    const workout = await this.getActiveWorkout(userId);

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
