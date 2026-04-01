import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { SurveyResponse } from '../types/survey-response';
import { MatchedPlayer, PlayerMatcherService } from './player-matcher.service';

describe('PlayerMatcherService', () => {
  let service: PlayerMatcherService;
  let apollo: { query: jest.Mock };
  let http: { get: jest.Mock };

  beforeEach(() => {
    apollo = {
      query: jest.fn(),
    };
    http = {
      get: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PlayerMatcherService,
        { provide: Apollo, useValue: apollo },
        { provide: HttpClient, useValue: http },
      ],
    });

    service = TestBed.inject(PlayerMatcherService);
  });

  it('prefers the exact internal club name over a fuzzy initials match', async () => {
    const clubPlayers = [
      createPlayer('1', 'Franky R. Mercy'),
      createPlayer('2', 'Mirko Laurens'),
      createPlayer('3', 'Karam Kaspar'),
    ];

    apollo.query.mockReturnValue(of({ data: { players: clubPlayers } }));

    const results = await service.matchPlayers(
      [
        createSurvey('Mirko Laurens'),
        createSurvey('Karam Kaspar'),
      ],
      'system-id',
      clubPlayers,
    );

    expect(results.map((result) => result.player?.fullName)).toEqual([
      'Mirko Laurens',
      'Karam Kaspar',
    ]);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('still matches a club player when the survey omits a middle initial', async () => {
    const clubPlayers = [createPlayer('1', 'Franky R. Mercy')];

    apollo.query.mockReturnValue(of({ data: { players: clubPlayers } }));

    const results = await service.matchPlayers(
      [createSurvey('Franky Mercy')],
      'system-id',
      clubPlayers,
    );

    expect(results[0].player?.fullName).toBe('Franky R. Mercy');
    expect(http.get).not.toHaveBeenCalled();
  });
});

function createPlayer(id: string, fullName: string): MatchedPlayer {
  const [firstName, ...rest] = fullName.split(' ');

  return {
    id,
    fullName,
    firstName,
    lastName: rest.join(' '),
    rankingLastPlaces: [],
  };
}

function createSurvey(fullName: string): SurveyResponse {
  const [firstName, ...rest] = fullName.split(' ');

  return {
    externalId: '',
    createdOn: '',
    createdBy: '',
    fullName,
    firstName,
    lastName: rest.join(' '),
    currentTeams: [],
    desiredTeamCount: 1,
    preferredPlayDay: '',
    team1Choice1: '',
    team1Choice2: '',
    team2Choice1: '',
    team2Choice2: '',
    canMeet75PercentTeam1: '',
    unavailabilityPeriodsTeam1: '',
    canMeet75PercentTeam2: '',
    unavailabilityPeriodsTeam2: '',
    comments: '',
    meetingAttendance: '',
    availableDates: [],
    stoppingCompetition: false,
    linkedContactIds: [],
  };
}