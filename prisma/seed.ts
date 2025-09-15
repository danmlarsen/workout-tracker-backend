import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create a user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: 'hashedpassword',
      exercises: {
        create: [
          {
            name: 'Bench Press',
            type: 'Strength',
            muscleGroup: 'Chest',
            equipment: 'Barbell',
          },
          {
            name: 'Squat',
            type: 'Strength',
            muscleGroup: 'Legs',
            equipment: 'Barbell',
          },
        ],
      },
      workouts: {
        create: [
          {
            title: 'Monday Workout',
            workoutExercises: {
              create: [
                {
                  exercise: { connect: { name: 'Bench Press' } },
                  workoutSets: {
                    create: [
                      { reps: 10, weight: 60 },
                      { reps: 8, weight: 70 },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Seeded user:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
