import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private prismaService: PrismaService) {}

  async getAllWorkouts() {
    return this.prismaService.workout.findMany({
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
}
