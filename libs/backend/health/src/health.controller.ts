import { Controller, Get, Logger, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  private _logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrm: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,

    // private readonly typesense: TypeSenseIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.typeOrm.pingCheck('database'), () => this.memory.checkHeap('memory_heap', 1 * 1024 * 1024 * 1024 * 1024)]);
  }

  @Get('Test')
  test() {
    throw new Error('Test error');

    return 'Test endpoint';
  }
}
