import { Player } from '@app/models';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwksClient } from 'jwks-rsa';
import { getRequest } from '../utils';
import { UserService } from '../services';
import { ALLOW_ANONYMOUS_META_KEY } from './anonymous.decorator';

@Injectable()
export class PermGuard implements CanActivate {
  private readonly _logger = new Logger(PermGuard.name);
  private readonly jwksClient: JwksClient;

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService,
    private userService: UserService,
  ) {
    this.jwksClient = new JwksClient({
      cache: true,
      jwksUri: `https://${this.configService.get('AUTH0_ISSUER_URL')}/.well-known/jwks.json`,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ANONYMOUS_META_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = getRequest(context);

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      return false;
    }

    try {
      const payload = await this.validateToken(token);

      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = await this.userService.validateUser(payload);
    } catch (e) {
      this._logger.error('Invalid token', e);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request?.headers?.['authorization']?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }


  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.decode(token, { complete: true });
      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new UnauthorizedException();
      }

      const signingKey = await this.jwksClient.getSigningKey(
        decoded.header.kid,
      );
      const payload = this.jwtService.verify(token, {
        algorithms: ['RS256'],
        publicKey: signingKey.getPublicKey(),
        audience: this.configService.get('AUTH0_AUDIENCE'),
        issuer: `https://${this.configService.get('AUTH0_ISSUER_URL')}/`,
      });
      return payload;
    } catch (error) {
      // Handle token validation error
      this._logger.error(`Error fetching token`, error);
    }
  }
}
