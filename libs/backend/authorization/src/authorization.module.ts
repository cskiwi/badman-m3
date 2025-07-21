import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from './services';

@Module({
  imports: [
    JwtModule.register({
      signOptions: { expiresIn: '30d' },
    }),
    ConfigModule
  ],
  providers: [UserService],
  exports: [JwtModule, UserService],
})
export class AuthorizationModule {}
