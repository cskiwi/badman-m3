import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PermGuard } from './decorators';

@Module({
  imports: [
    ConfigModule,

    JwtModule.register({
      signOptions: { expiresIn: '30d' },
    }),
  ],
  providers: [PermGuard],
  exports: [JwtModule, PermGuard],
})
export class AuthorizationModule {}
