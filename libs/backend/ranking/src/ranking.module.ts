import { Module } from '@nestjs/common';
import { PointService } from './services';

@Module({
  imports: [],
  controllers: [],
  providers: [PointService],
  exports: [PointService],
})
export class RankingModule {}
