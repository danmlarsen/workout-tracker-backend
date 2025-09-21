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

  findExerciseById(exerciseId: number, userId: number) {
    return this.prismaService.exercise.findFirst({
      where: {
        AND: [{ id: exerciseId }, { OR: [{ userId }, { userId: null }] }],
      },
    });
  }

  async updateExercise(
    exerciseId: number,
    userId: number,
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
}
