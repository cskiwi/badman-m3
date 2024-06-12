import { Controller, Get } from '@nestjs/common';
import { RoutesGeneratorService } from '../services/routes-generator.service';

@Controller('routes')
export class RoutesGeneratorController {
  constructor(private routeGenerator: RoutesGeneratorService) {}

  @Get()
  generateRoutes() {
    return this.routeGenerator.generateRoutesTxt();
  }
}
