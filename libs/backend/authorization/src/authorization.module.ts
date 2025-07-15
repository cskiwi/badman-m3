import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [
    JwtModule.register({
      signOptions: { expiresIn: '30d' },
    }),
    ConfigModule
  ],
  exports: [JwtModule],
})
export class AuthorizationModule {}
