import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [PrismaModule, WorkoutsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
