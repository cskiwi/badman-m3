import { Controller, Get, Res } from '@nestjs/common';
import { RoutesGeneratorService } from '../services/routes-generator.service';
import { IsrService } from '../services/isr.service';

@Controller('routes')
export class RoutesGeneratorController {
  constructor(
    private routeGenerator: RoutesGeneratorService,
    private readonly isrService: IsrService,
  ) {}

  @Get()
  generateRoutes() {
    return this.routeGenerator.generateRoutesTxt();
  }

  // @Get('test')
  // invalidate() {
  //   try {
  //     this.isrService.invalidate(['/player/shane-herssens']);
  //     // return a json that the paths are being invalidated
  //     return { message: 'Invalidating paths' };
  //   } catch (e) {
  //     console.error(e);
  //     return 'Error invalidating paths';
  //   }
  // }
}
