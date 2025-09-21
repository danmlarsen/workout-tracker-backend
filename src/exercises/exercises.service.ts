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

  findAllExercises(userId: number) {
    return this.prismaService.exercise.findMany({
      where: {
        OR: [{ userId }, { userId: null }],
      },
    });
  }

  findExerciseById(userId: number, exerciseId: number) {
    return this.prismaService.exercise.findFirst({
      where: {
        AND: [{ id: exerciseId }, { OR: [{ userId }, { userId: null }] }],
      },
    });
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
}
