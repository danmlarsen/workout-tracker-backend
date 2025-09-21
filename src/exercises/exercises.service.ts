import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExerciseDto } from './dtos/create-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prismaService: PrismaService) {}

  create(userId: number | null, data: CreateExerciseDto) {
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
}
