import {
  Controller,
  Get,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /**
   * Check basic health status of the API and database connection
   * @throws {503} Database unavailable.
   */
  @Get()
  async check() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
      };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }

  /**
   * Get detailed health status (auth required)
   * @throws {401} Unauthorized.
   * @throws {503} Database unavailable.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('detailed')
  async detailed() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        migrations: await this.prisma.$queryRaw`
          SELECT migration_name FROM _prisma_migrations
          ORDER BY finished_at DESC LIMIT 1
        `,
      };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
