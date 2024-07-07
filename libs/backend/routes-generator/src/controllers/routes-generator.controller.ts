import { Controller, Get } from '@nestjs/common';
import { RoutesGeneratorService } from '../services/routes-generator.service';

@Controller('routes')
export class RoutesGeneratorController {
  constructor(private routeGenerator: RoutesGeneratorService) {}

  @Get()
  generateRoutes() {
    return this.routeGenerator.generateRoutesTxt();
  }

  // @Get('test')
  // invalidate() {
  //   try {
  //     this.invalidateService.invalidate(['/player/shane-herssens']);
  //     // return a json that the paths are being invalidated
  //     return { message: 'Invalidating paths' };
  //   } catch (e) {
  //     console.error(e);
  //     return 'Error invalidating paths';
  //   }
  // }
}
