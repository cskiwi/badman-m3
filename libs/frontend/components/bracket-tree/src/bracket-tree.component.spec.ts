import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BracketTree } from './bracket-tree.component';
import { Game, GamePlayerMembership, Player } from '@app/models';

describe('BracketTree', () => {
  let component: BracketTree;
  let fixture: ComponentFixture<BracketTree>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BracketTree]
    }).compileComponents();

    fixture = TestBed.createComponent(BracketTree);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getTeamName', () => {
    it('should extract correct team names from game player memberships', () => {
      // Create mock players
      const player1 = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe'
      } as Player;

      const player2 = {
        id: '2', 
        firstName: 'Jane',
        lastName: 'Smith',
        fullName: 'Jane Smith'
      } as Player;

      // Create mock game player memberships
      const memberships: GamePlayerMembership[] = [
        {
          id: 'm1',
          playerId: '1',
          gameId: 'game1',
          team: 1,
          gamePlayer: player1
        } as GamePlayerMembership,
        {
          id: 'm2', 
          playerId: '2',
          gameId: 'game1',
          team: 2,
          gamePlayer: player2
        } as GamePlayerMembership
      ];

      // Create mock game
      const game = {
        id: 'game1',
        round: 'R16',
        winner: 1,
        gamePlayerMemberships: memberships
      } as unknown as Game;

      // Test team 1 name extraction
      const team1Name = component.getTeamName(game, 1);
      expect(team1Name).toBe('John Doe');

      // Test team 2 name extraction  
      const team2Name = component.getTeamName(game, 2);
      expect(team2Name).toBe('Jane Smith');
    });

    it('should handle missing gamePlayer relations gracefully', () => {
      const memberships: GamePlayerMembership[] = [
        {
          id: 'm1',
          playerId: '1',
          gameId: 'game1',
          team: 1,
          gamePlayer: undefined as unknown
        } as GamePlayerMembership
      ];

      const game = {
        id: 'game1',
        round: 'R16',
        gamePlayerMemberships: memberships
      } as unknown as Game;

      const teamName = component.getTeamName(game, 1);
      expect(teamName).toContain('Player');
    });

    it('should handle empty memberships gracefully', () => {
      const game = {
        id: 'game1',
        round: 'R16',
        gamePlayerMemberships: []
      } as unknown as Game;

      const teamName = component.getTeamName(game, 1);
      expect(teamName).toBe('');
    });

    it('should handle missing gamePlayerMemberships gracefully', () => {
      const game = {
        id: 'game1',
        round: 'R16'
      } as unknown as Game;

      const teamName = component.getTeamName(game, 1);
      expect(teamName).toBe('');
    });
  });

  describe('sortGamesByBracketPosition', () => {
    it('should sort games by order field when available', () => {
      const games: Game[] = [
        { id: 'game1', order: 3, round: 'R16' } as unknown as Game,
        { id: 'game2', order: 1, round: 'R16' } as unknown as Game,
        { id: 'game3', order: 2, round: 'R16' } as unknown as Game,
      ];

      // Set games input
      fixture.componentRef.setInput('games', games);
      fixture.detectChanges();

      const bracketRounds = component.bracketRounds();
      expect(bracketRounds).toBeTruthy();

      const r16Round = bracketRounds?.find(round => round.name.includes('16'));
      expect(r16Round?.games[0].order).toBe(1);
      expect(r16Round?.games[1].order).toBe(2);
      expect(r16Round?.games[2].order).toBe(3);
    });

    it('should sort games by visualCode when order is not available', () => {
      const games: Game[] = [
        { id: 'game1', visualCode: 'C', round: 'R16' } as unknown as Game,
        { id: 'game2', visualCode: 'A', round: 'R16' } as unknown as Game,
        { id: 'game3', visualCode: 'B', round: 'R16' } as unknown as Game,
      ];

      fixture.componentRef.setInput('games', games);
      fixture.detectChanges();

      const bracketRounds = component.bracketRounds();
      expect(bracketRounds).toBeTruthy();

      const r16Round = bracketRounds?.find(round => round.name.includes('16'));
      expect(r16Round?.games[0].visualCode).toBe('A');
      expect(r16Round?.games[1].visualCode).toBe('B');
      expect(r16Round?.games[2].visualCode).toBe('C');
    });
  });
});