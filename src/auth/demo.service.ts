import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from './auth.service';
import crypto from 'crypto';
import { Exercise, Prisma, UserType } from '@prisma/client';

@Injectable()
export class DemoService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async validateDemoToken(token: string) {
    const demoToken = await this.prismaService.demoAccessToken.findUnique({
      where: { token },
    });

    if (!demoToken || !demoToken.isActive) {
      throw new UnauthorizedException('Invalid demo access token');
    }

    if (demoToken.expiresAt && demoToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Demo access token has expired');
    }

    if (demoToken.maxUsages && demoToken.usageCount >= demoToken.maxUsages) {
      throw new UnauthorizedException('Demo access token usage limit reached');
    }

    await this.prismaService.demoAccessToken.update({
      where: { id: demoToken.id },
      data: { usageCount: { increment: 1 } },
    });

    return demoToken;
  }

  async createDemoSession(token: string) {
    await this.validateDemoToken(token);

    const demoUser = await this.createDemoUser();

    return this.authService.login(demoUser);
  }

  private async createDemoUser() {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');

    const demoUser = await this.prismaService.user.create({
      data: {
        email: `demo-${timestamp}-${randomSuffix}@nextlift.app`,
        password: 'demo-password-not-used',
        isEmailConfirmed: true,
        isActive: true,
        userType: 'DEMO',
        demoExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      },
    });

    await this.seedDemoData(demoUser.id);

    return demoUser;
  }

  private async seedDemoData(userId: number) {
    const exercises = await this.prismaService.exercise.findMany({
      where: { userId: -1 },
      orderBy: { name: 'asc' },
    });

    if (exercises.length === 0) {
      console.warn('No system exercises found for demo data seeding');
      return;
    }

    const workoutDates = this.generateRandomWorkoutDates(10);

    // Create workouts for each date
    for (let i = 0; i < workoutDates.length; i++) {
      const workoutDate = workoutDates[i];
      await this.createDemoWorkout(userId, exercises, workoutDate, i);
    }
  }

  private generateRandomWorkoutDates(count: number): Date[] {
    const now = new Date();
    const dates = new Set<string>(); // Use string dates to avoid duplicates
    const workoutDates: Date[] = [];

    while (dates.size < count) {
      // Random number of days between 20 and 0
      const daysOffset = Math.floor(Math.random() * -20);
      const workoutDate = new Date(now);
      workoutDate.setDate(workoutDate.getDate() + daysOffset);

      // Reset time to avoid same-day conflicts
      workoutDate.setHours(0, 0, 0, 0);

      const dateString = workoutDate.toISOString().split('T')[0];

      if (!dates.has(dateString)) {
        dates.add(dateString);

        // Set realistic workout time (6 AM to 9 PM)
        const workoutHour = 6 + Math.floor(Math.random() * 15);
        const workoutMinute = Math.floor(Math.random() * 60);
        workoutDate.setHours(workoutHour, workoutMinute);

        workoutDates.push(new Date(workoutDate));
      }
    }

    // Sort by date (oldest first)
    return workoutDates.sort((a, b) => a.getTime() - b.getTime());
  }

  private async createDemoWorkout(
    userId: number,
    exercises: Exercise[],
    workoutDate: Date,
    index: number,
  ) {
    // Use transaction to batch all workout-related operations
    return this.prismaService.$transaction(async (prisma) => {
      // Workout duration between 30-90 minutes
      const durationMinutes = 30 + Math.floor(Math.random() * 61);
      const completedAt = new Date(
        workoutDate.getTime() + durationMinutes * 60 * 1000,
      );

      const workoutTypes = [
        'Push Day',
        'Pull Day',
        'Leg Day',
        'Upper Body',
        'Full Body',
        'Cardio & Strength',
        'Back & Biceps',
        'Chest & Triceps',
        'Shoulders & Arms',
        'HIIT Session',
      ];

      const workoutTitle = workoutTypes[index % workoutTypes.length];
      const workoutNotes =
        Math.random() < 0.3 ? this.getRandomWorkoutNote() : null;

      // Create the workout
      const workout = await prisma.workout.create({
        data: {
          userId,
          title: workoutTitle,
          status: 'COMPLETED',
          startedAt: workoutDate,
          completedAt,
          activeDuration: durationMinutes * 60,
          notes: workoutNotes,
        },
      });

      // Select exercises for this workout
      const exerciseCount = 3 + Math.floor(Math.random() * 4);
      const selectedExercises = this.selectRandomExercises(
        exercises,
        exerciseCount,
      );

      // Prepare all workout exercises data
      const workoutExercisesData = selectedExercises.map((exercise, j) => ({
        workoutId: workout.id,
        exerciseId: exercise.id,
        exerciseOrder: j + 1,
        notes: Math.random() < 0.2 ? this.getRandomExerciseNote() : null,
      }));

      // Create all workout exercises in batch
      await prisma.workoutExercise.createMany({
        data: workoutExercisesData,
      });

      // Get the created workout exercises with their IDs
      const createdWorkoutExercises = await prisma.workoutExercise.findMany({
        where: { workoutId: workout.id },
        orderBy: { exerciseOrder: 'asc' },
      });

      // Generate all sets data for all exercises in this workout
      const allSetsData: Prisma.WorkoutSetCreateManyInput[] = [];

      for (let j = 0; j < createdWorkoutExercises.length; j++) {
        const workoutExercise = createdWorkoutExercises[j];
        const exercise = selectedExercises[j];

        const setsForThisExercise = this.generateDemoSetsData(
          workoutExercise.id,
          exercise,
          index,
        );

        allSetsData.push(...setsForThisExercise);
      }

      // Create all sets in one batch operation
      if (allSetsData.length > 0) {
        await prisma.workoutSet.createMany({
          data: allSetsData,
        });
      }

      return workout;
    });
  }

  private selectRandomExercises(
    allExercises: Exercise[],
    count: number,
  ): Exercise[] {
    const shuffled = [...allExercises].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, allExercises.length));
  }

  private generateDemoSetsData(
    workoutExerciseId: number,
    exercise: Exercise,
    workoutIndex: number,
  ) {
    const numSets = 3 + Math.floor(Math.random() * 3); // 3-5 sets
    const setsData: Prisma.WorkoutSetCreateManyInput[] = [];

    for (let setNum = 1; setNum <= numSets; setNum++) {
      const isWarmup = setNum === 1 && Math.random() < 0.4; // 40% chance first set is warmup

      let reps: null | number = null;
      let weight: null | number = null;
      let duration: null | number = null;

      if (exercise.category === 'strength') {
        if (isWarmup) {
          reps = 8 + Math.floor(Math.random() * 5); // 8-12 reps for warmup
          weight = 40 + Math.floor(Math.random() * 30); // 40-70kg for warmup
        } else {
          reps = 6 + Math.floor(Math.random() * 8); // 6-13 reps
          // Progressive weight over time (workouts get heavier)
          const baseWeight = 60 + workoutIndex * 2.5; // Gradual progression
          weight = baseWeight + Math.floor(Math.random() * 20); // Add some variation
        }
      } else if (exercise.category === 'cardio') {
        duration = 180 + Math.floor(Math.random() * 600); // 3-13 minutes
      }

      setsData.push({
        workoutExerciseId,
        setNumber: setNum,
        completed: true,
        reps,
        weight,
        duration,
        type: isWarmup ? 'warmup' : 'normal',
        notes: Math.random() < 0.1 ? 'Felt great!' : null, // 10% chance of set notes
      });
    }

    return setsData;
  }

  // Cleanup job to remove expired demo users
  // @Cron('0 */15 * * * *') // Every 15 minutes
  async cleanupExpiredDemoUsers() {
    const whereClause = {
      userType: UserType.DEMO,
      demoExpiresAt: { lt: new Date() },
    };

    const usersToDelete = await this.prismaService.user.findMany({
      where: whereClause,
    });

    if (usersToDelete.length > 0) {
      await this.prismaService.$transaction(async (tx) => {
        await tx.deletedUser.createMany({
          data: usersToDelete.map((users) => ({
            originalUserId: users.id,
            email: users.email,
            createdAt: users.createdAt,
          })),
        });

        return tx.user.deleteMany({
          where: whereClause,
        });
      });
    }
  }

  private getRandomWorkoutNote(): string {
    const notes = [
      'Great session today! Felt strong.',
      'Tough workout but pushed through.',
      'New PR on several exercises!',
      'Felt a bit tired but good overall.',
      'Really focused on form today.',
      'Challenging but rewarding session.',
      'Energy was high, great workout!',
      'Struggled a bit but finished strong.',
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  }

  private getRandomExerciseNote(): string {
    const notes = [
      'Perfect form today',
      'Increased weight from last time',
      'Felt the burn!',
      'Good mind-muscle connection',
      'Full range of motion',
      'Controlled tempo',
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  }
}
