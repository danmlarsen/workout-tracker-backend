import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, WorkoutsModule, UsersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
