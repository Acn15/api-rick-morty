import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { CacheService } from '../infrastructure/redis-cache/cache.service';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly cacheService: CacheService) {}

  @Get()
  check(): { status: string; cache: string } {
    return {
      status: 'ok',
      cache: this.cacheService.getBackend(),
    };
  }
}
