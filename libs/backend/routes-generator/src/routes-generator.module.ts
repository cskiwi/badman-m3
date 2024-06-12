import { Module } from '@nestjs/common';
import { RoutesGeneratorController } from './controllers/routes-generator.controller';
import { RoutesGeneratorService } from './services/routes-generator.service';

@Module({
  controllers: [RoutesGeneratorController],
  providers: [RoutesGeneratorService],
  exports: [RoutesGeneratorService],
})
export class RoutesGeneratorModule {}
