import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TournamentApiClient } from './client/tournament-api.client';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [TournamentApiClient],
  exports: [TournamentApiClient],
})
export class TournamentApiModule {}
