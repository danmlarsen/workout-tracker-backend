import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWorkoutSetDto } from './dtos/create-workout-set.dto';
import { UpdateWorkoutSetDto } from './dtos/update-workout-set.dto';

@Injectable()
export class WorkoutSetService {
  constructor(private readonly prismaService: PrismaService) {}

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

  async deleteWorkoutSet(id: number, userId: number) {
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

    return this.prismaService.$transaction(async (tx) => {
      await tx.workoutSet.updateMany({
        where: {
          workoutExerciseId: workoutSet.workoutExerciseId,
          setNumber: {
            gt: workoutSet.setNumber,
          },
        },
        data: {
          setNumber: {
            decrement: 1,
          },
        },
      });

      const deletedSet = await tx.workoutSet.delete({
        where: { id },
      });

      return deletedSet;
    });
  }
}
