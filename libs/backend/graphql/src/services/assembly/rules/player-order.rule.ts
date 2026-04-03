import { SubEventTypeEnum } from '@app/models-enum';
import { AssemblyValidationError } from '../assembly-output';
import { PlayerWithRanking, ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class PlayerOrderRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { single1, single2, single3, single4, double1, double2, double3, double4, type, system } = data;
    const errors: AssemblyValidationError[] = [];
    const defaultRanking = system?.amountOfLevels ?? 12;

    const s1 = this.checkSingle('single1', 'single2', defaultRanking, single1, single2);
    if (s1) errors.push(s1);

    const s3 = this.checkSingle('single3', 'single4', defaultRanking, single3, single4);
    if (s3) errors.push(s3);

    const mixType = type === SubEventTypeEnum.MX ? 'mix' : 'double';
    const d3 = this.checkDouble(
      type === SubEventTypeEnum.MX ? 'mix3' : 'double3',
      type === SubEventTypeEnum.MX ? 'mix4' : 'double4',
      defaultRanking, mixType, double3, double4,
    );
    if (d3) errors.push(d3);

    if (type !== SubEventTypeEnum.MX) {
      const d1 = this.checkDouble('double1', 'double2', defaultRanking, 'double', double1, double2);
      if (d1) errors.push(d1);

      const s2 = this.checkSingle('single2', 'single3', defaultRanking, single2, single3);
      if (s2) errors.push(s2);

      const d2 = this.checkDouble('double2', 'double3', defaultRanking, 'double', double2, double3);
      if (d2) errors.push(d2);
    }

    return { valid: errors.length === 0, errors };
  }

  private checkSingle(
    game1: string,
    game2: string,
    defaultRanking: number,
    p1?: PlayerWithRanking,
    p2?: PlayerWithRanking,
  ): AssemblyValidationError | undefined {
    if (!p1 || !p2) return;
    const r1 = p1.rankingLastPlaces?.[0]?.single ?? defaultRanking;
    const r2 = p2.rankingLastPlaces?.[0]?.single ?? defaultRanking;
    if (r2 < r1) {
      return {
        message: 'all.v1.teamFormation.errors.player-order-single',
        params: {
          game1, game2,
          player1: { id: p1.id, fullName: p1.fullName, ranking: r1 },
          player2: { id: p2.id, fullName: p2.fullName, ranking: r2 },
        },
      };
    }
    return;
  }

  private checkDouble(
    game1: string,
    game2: string,
    defaultRanking: number,
    rankType: 'double' | 'mix',
    d1?: [PlayerWithRanking, PlayerWithRanking],
    d2?: [PlayerWithRanking, PlayerWithRanking],
  ): AssemblyValidationError | undefined {
    if (!d1?.[0]?.id || !d1?.[1]?.id || !d2?.[0]?.id || !d2?.[1]?.id) return;

    let d1p1 = d1[0].rankingLastPlaces?.[0]?.[rankType] ?? defaultRanking;
    let d1p2 = d1[1].rankingLastPlaces?.[0]?.[rankType] ?? defaultRanking;
    let d2p1 = d2[0].rankingLastPlaces?.[0]?.[rankType] ?? defaultRanking;
    let d2p2 = d2[1].rankingLastPlaces?.[0]?.[rankType] ?? defaultRanking;

    let t1p1 = d1[0], t1p2 = d1[1];
    if (d1p1 > d1p2) { [t1p1, t1p2] = [d1[1], d1[0]]; [d1p1, d1p2] = [d1p2, d1p1]; }
    let t2p1 = d2[0], t2p2 = d2[1];
    if (d2p1 > d2p2) { [t2p1, t2p2] = [d2[1], d2[0]]; [d2p1, d2p2] = [d2p2, d2p1]; }

    if (d2p1 + d2p2 < d1p1 + d1p2) {
      return {
        message: 'all.v1.teamFormation.errors.player-order-doubles',
        params: {
          game1, game2,
          team1player1: { id: t1p1.id, fullName: t1p1.fullName, ranking: d1p1 },
          team1player2: { id: t1p2.id, fullName: t1p2.fullName, ranking: d1p2 },
          team2player1: { id: t2p1.id, fullName: t2p1.fullName, ranking: d2p1 },
          team2player2: { id: t2p2.id, fullName: t2p2.fullName, ranking: d2p2 },
        },
      };
    } else if (d1p1 + d1p2 === d2p1 + d2p2) {
      if (Math.min(d2p1, d2p2) < Math.min(d1p1, d1p2)) {
        return {
          message: 'all.v1.teamFormation.errors.player-order-highest',
          params: {
            game1, game2,
            team1player1: { id: t1p1.id, fullName: t1p1.fullName, ranking: d1p1 },
            team1player2: { id: t1p2.id, fullName: t1p2.fullName, ranking: d1p2 },
            team2player1: { id: t2p1.id, fullName: t2p1.fullName, ranking: d2p1 },
            team2player2: { id: t2p2.id, fullName: t2p2.fullName, ranking: d2p2 },
          },
        };
      }
    }

    return undefined;
  }
}
