import { Controller, Get } from '@nestjs/common';
import { ok } from '../common/responses/api-response';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return ok({
      status: 'healthy',
      service: 'read-and-conquer-api',
      timestamp: new Date().toISOString(),
    });
  }
}
