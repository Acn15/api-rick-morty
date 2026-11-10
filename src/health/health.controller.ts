import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  // HealthIndicatorResult,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
// import { PrismaService } from '../prisma/prisma.service';
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly httpHealthIndicator: HttpHealthIndicator,
    // private readonly prismaService: PrismaService,
  ) {}
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () =>
        this.httpHealthIndicator.pingCheck(
          'nestjs-docs',
          'https://docs.nestjs.com',
        ),
      // async () => this.checkDatabase(),
    ]);
  }
  // private async checkDatabase(): Promise<HealthIndicatorResult> {
  //   await this.prismaService.healthCheck();
  //   return { database: { status: 'up' } };
  // }
}
