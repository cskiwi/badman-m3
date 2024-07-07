import { Module } from '@nestjs/common';
import { RoutesGeneratorController } from './controllers/routes-generator.controller';
import { RoutesGeneratorService } from './services/routes-generator.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { InvalidateService } from './services/invalidate.service';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [RoutesGeneratorController],
  providers: [RoutesGeneratorService, InvalidateService],
  exports: [RoutesGeneratorService],
})
export class RoutesGeneratorModule {}
