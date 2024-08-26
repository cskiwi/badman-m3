import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [
    ConfigModule,

    JwtModule.register({
      signOptions: { expiresIn: '30d' },
    }),
  ],
  exports: [JwtModule],
})
export class AuthorizationModule {}
