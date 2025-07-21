import { Player } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly _logger = new Logger(UserService.name);

  /**
   * Validates and loads a user by their Auth0 sub, including their claims
   */
  async validateUser(payload: { sub?: string }): Promise<Player | typeof payload> {
    if (payload.sub) {
      try {
        const user = await Player.findOne({
          where: { sub: payload.sub },
          relations: ['claims'],
        });
        
        if (user) {
          return user;
        }
      } catch (e) {
        this._logger.error('Error loading user with claims', e);
      }
    }
    return payload;
  }
}