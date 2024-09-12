import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
@Module({
  imports: [
    JwtModule.register({
      signOptions: { expiresIn: '30d' },
    }),
  ],
  exports: [JwtModule],
})
export class AuthorizationModule {}
