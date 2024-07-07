import { Module } from '@nestjs/common';
import { RoutesGeneratorController } from './controllers/routes-generator.controller';
import { RoutesGeneratorService } from './services/routes-generator.service';
import { HttpModule } from '@nestjs/axios';
import { IsrService } from './services/isr.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [RoutesGeneratorController],
  providers: [RoutesGeneratorService, IsrService],
  exports: [RoutesGeneratorService],
})
export class RoutesGeneratorModule {}
