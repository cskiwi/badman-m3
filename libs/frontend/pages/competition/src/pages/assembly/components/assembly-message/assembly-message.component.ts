import { ChangeDetectionStrategy, Component, inject, input, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ValidationMessage } from '../../page-assembly.service';

interface ValidationPlayer {
  id?: string;
  fullName?: string;
  gender?: string;
  ranking?: number;
}

@Component({
  selector: 'app-assembly-message',
  standalone: true,
  imports: [AsyncPipe],
  template: '<span [innerHTML]="translatedMessage$ | async"></span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyMessageComponent implements OnInit {
  private readonly translate = inject(TranslateService);
  validation = input<ValidationMessage>();

  translatedMessage$: Observable<string> = of('');

  ngOnInit() {
    this.translatedMessage$ = this._getTranslatedMessage();
  }

  private _getTranslatedMessage(): Observable<string> {
    const v = this.validation();
    if (!v?.message) return of('');

    return this._getParams().pipe(
      switchMap((params) =>
        this.translate.get(v.message).pipe(
          map((template) => this._interpolate(template, params)),
        ),
      ),
    );
  }

  /** Manually interpolate {param} single-brace placeholders (ngx-translate only supports {{param}}). */
  private _interpolate(template: string, params: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const val = params[key];
      return val != null ? String(val) : match;
    });
  }

  private _getParams(): Observable<Record<string, unknown>> {
    return combineLatest([
      this._getGame('game1'),
      this._getGame('game2'),
      this._getGame('game'),
      this._getRequiredGender(),
      this._getPlayers(),
      this._getIndex(),
      this._getMax(),
      this._getMaxLevel(),
    ]).pipe(
      map(([game1, game2, game, gender, players, index, minMax, maxLevel]) => {
        const params: Record<string, unknown> = {};

        if (game1) params['game1'] = game1.toLowerCase();
        if (game2) params['game2'] = game2.toLowerCase();
        if (game) params['game'] = game.toLowerCase();
        if (gender) params['gender'] = gender;
        if (minMax?.['max'] != null) params['max'] = minMax['max'];

        return { ...params, ...players, ...index, ...maxLevel };
      }),
    );
  }

  private _getGame(gameKey: string): Observable<string | undefined> {
    const game = this.validation()?.params?.[gameKey] as string | undefined;
    if (!game) return of(undefined);

    return this.translate.get(`all.v1.teamFormation.info.params.${game}`);
  }

  private _getRequiredGender(): Observable<string | undefined> {
    const gender = this.validation()?.params?.['gender'] as string | undefined;
    if (!gender) return of(undefined);

    return of(this._translateGender(gender));
  }

  private _translateGender(gender: string): string {
    switch (gender) {
      case 'F':
        return this.translate.instant('all.v1.teamFormation.info.params.gender.female').toLocaleLowerCase();
      case 'M':
        return this.translate.instant('all.v1.teamFormation.info.params.gender.male').toLocaleLowerCase();
      default:
        return this.translate.instant(`all.v1.teamFormation.info.params.gender.${gender}`).toLocaleLowerCase();
    }
  }

  private _getPlayers(): Observable<Record<string, unknown>> {
    const params: Record<string, unknown> = {};
    const v = this.validation()?.params;
    if (!v) return of(params);

    const playerKeys = ['player', 'player1', 'player2', 'team1player1', 'team1player2', 'team2player1', 'team2player2'] as const;

    for (const key of playerKeys) {
      const p = v[key] as ValidationPlayer | undefined;
      if (!p) continue;

      params[`${key}FullName`] = p.fullName ?? '';
      if (p.gender) {
        params[`${key}Gender`] = this._translateGender(p.gender);
      }
      if (p.ranking != null) {
        params[`${key}Ranking`] = p.ranking;
      }
    }

    return of(params);
  }

  private _getMax(): Observable<Record<string, unknown>> {
    const params: Record<string, unknown> = {};
    const max = this.validation()?.params?.['max'];
    if (max != null) params['max'] = max;
    return of(params);
  }

  private _getIndex(): Observable<Record<string, unknown>> {
    const params: Record<string, unknown> = {};
    const v = this.validation()?.params;
    if (!v) return of(params);

    for (const key of ['teamIndex', 'baseIndex', 'minIndex', 'maxIndex']) {
      if (v[key] != null) params[key] = v[key];
    }

    return of(params);
  }

  private _getMaxLevel(): Observable<Record<string, unknown>> {
    const params: Record<string, unknown> = {};
    const v = this.validation()?.params;
    if (!v) return of(params);

    if (v['minLevel'] != null) params['minLevel'] = v['minLevel'];
    if (v['rankingType']) {
      params['rankingType'] = this.translate
        .instant(`all.v1.teamFormation.info.params.ranking.${v['rankingType']}`)
        .toLowerCase();
    }

    return of(params);
  }
}
