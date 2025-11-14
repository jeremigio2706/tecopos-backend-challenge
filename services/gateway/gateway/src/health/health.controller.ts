import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';

@Public() // Excluir del JWT auth
@SkipThrottle() // Excluir health check del rate limiting
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'gateway',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
