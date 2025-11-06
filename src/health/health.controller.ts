import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        //   migrations: await this.prisma.$queryRaw`
        //   SELECT migration_name FROM _prisma_migrations
        //   ORDER BY finished_at DESC LIMIT 1
        // `,
      };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
