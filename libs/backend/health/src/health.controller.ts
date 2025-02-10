import {
  Controller,
  Get,
  Headers,
  Logger,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Args } from '@nestjs/graphql';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  private _logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly typeOrm: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.typeOrm.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 1 * 1024 * 1024 * 1024 * 1024),
    ]);
  }

  @Get('test')
  randomTest(@Headers('X-MY-APP-CLIENT') auth: any) {
    this._logger.log(`Received key: ${auth}`);

    // create typorm trnasaction

    return {
      message: 'Hello World!',
    };
  }
}
