import { Controller, Get } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';

@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  getAllWorkouts() {
    return this.workoutsService.getAllWorkouts();
  }
}
