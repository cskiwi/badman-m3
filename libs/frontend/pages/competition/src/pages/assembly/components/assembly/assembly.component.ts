import { NgTemplateOutlet } from '@angular/common';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  copyArrayItem,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FieldsetModule } from 'primeng/fieldset';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { AssemblyPlayerComponent } from '../assembly-player/assembly-player.component';
import { AssemblyMessageComponent } from '../assembly-message/assembly-message.component';
import { PartnerCombinationsComponent } from '../partner-combinations/partner-combinations.component';
import { AssemblyService, PlayerWithRanking } from '../../page-assembly.service';
import { AssemblyGeneratorService, GenerateStrategy, PlayerStat, SlotPairStat, SlotStat, TimeRange } from '../../assembly-generator.service';
import { AuthService } from '@app/frontend-modules-auth/service';
import { Player } from '@app/models';
import { TeamMembershipType } from '@app/models-enum';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-assembly',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NgTemplateOutlet,
    TranslateModule,
    CdkDrag,
    CdkDropList,
    FieldsetModule,
    PanelModule,
    DividerModule,
    ProgressBarModule,
    SelectModule,
    AutoCompleteModule,
    FloatLabelModule,
    ButtonModule,
    TooltipModule,
    MessageModule,
    CheckboxModule,
    InputTextModule,
    AssemblyPlayerComponent,
    AssemblyMessageComponent,
    PartnerCombinationsComponent,
  ],
  templateUrl: './assembly.component.html',
  styleUrl: './assembly.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssemblyComponent {
  private readonly authService = inject(AuthService);
  readonly generatorService = inject(AssemblyGeneratorService);

  formGroup = input.required<FormGroup>();
  readonly dataService = inject(AssemblyService);

  validationOverview = output<{ valid: boolean; template: TemplateRef<HTMLElement> }>();

  validationTemplate = viewChild<TemplateRef<HTMLElement>>('validationOverviewTemplate');

  isMobile = signal(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  // Auto-generate state
  generating = signal(false);
  selectedTimeRange = signal<TimeRange>('both-seasons');
  selectedWeeks = signal(52);

  timeRangeOptions = [
    { label: 'all.competition.team-assembly.auto-generate.both-seasons', value: 'both-seasons' as TimeRange },
    { label: 'all.competition.team-assembly.auto-generate.this-season', value: 'season' as TimeRange },
    { label: 'all.competition.team-assembly.auto-generate.last-season', value: 'last-season' as TimeRange },
    { label: 'all.competition.team-assembly.auto-generate.last-x-weeks', value: 'last-weeks' as TimeRange },
  ];

  allPlayersSelected = computed(() => {
    const all = [...this.dataService.players()[TeamMembershipType.REGULAR], ...this.dataService.players()[TeamMembershipType.BACKUP]];
    if (all.length === 0) return false;
    return all.every((p) => this.dataService.isPlayerAvailable(p.id));
  });

  lists = [
    'playerList',
    'substituteList',
    'single1',
    'single2',
    'single3',
    'single4',
    'double1',
    'double2',
    'double3',
    'double4',
  ];

  // Captain search
  captainSuggestions = signal<PlayerWithRanking[]>([]);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.isMobile.set(window.innerWidth <= 768);
      });
    }

    // Emit validation overview when validation changes
    effect(() => {
      const template = this.validationTemplate();
      const service = this.dataService;
      const valid = service.valid();
      if (template) {
        this.validationOverview.emit({ valid, template });
      }
    });

    // Watch team/encounter changes
    effect(() => {
      const fg = this.formGroup();
      if (!fg) return;

      const teamControl = fg.get('team');
      const encounterControl = fg.get('encounter');

      teamControl?.valueChanges.subscribe(() => {
        const encounterId = encounterControl?.value;
        this.dataService.loadData(encounterId);
      });

      encounterControl?.valueChanges.subscribe((encounterId) => {
        if (teamControl?.value) {
          this.dataService.loadData(encounterId);
        }
      });
    });

    // Load stats when data is loaded
    effect(() => {
      if (this.dataService.loaded()) {
        this.refreshStats();
      }
    });
  }

  async refreshStats(forceRefresh = false) {
    await this.generatorService.loadStats(this.selectedTimeRange(), this.selectedWeeks(), forceRefresh);
  }

  getPlayerStat(playerId: string): PlayerStat | null {
    const stats = this.generatorService.playerStats();
    return stats.get(playerId) ?? null;
  }

  getPlayerWinPct(playerId: string): number | null {
    const stat = this.getPlayerStat(playerId);
    return stat ? stat.winPct : null;
  }

  getSlotWinPct(slotId: string): SlotStat | null {
    const stats = this.generatorService.slotStats();
    return stats.get(slotId) ?? null;
  }

  getSlotPairStat(slotId: string, player1Id: string, player2Id: string): SlotPairStat | null {
    const key = [player1Id, player2Id].sort().join(':');
    return this.generatorService.slotPairStats().get(slotId)?.get(key) ?? null;
  }

  getTotalPairStat(player1Id: string, player2Id: string): SlotPairStat | null {
    const key = [player1Id, player2Id].sort().join(':');
    return this.generatorService.totalPairStats().get(key) ?? null;
  }

  searchCaptain(event: { query: string }) {
    const service = this.dataService;
    const allPlayers = [
      ...service.players()[TeamMembershipType.REGULAR],
      ...service.players()[TeamMembershipType.BACKUP],
    ];
    const query = event.query.toLowerCase();
    this.captainSuggestions.set(
      allPlayers.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)),
    );
  }

  selectCaptain(player: PlayerWithRanking) {
    this.formGroup().get('captain')?.setValue(player.id);
  }

  // CDK Drag-and-Drop
  canDropPredicate = (item: CdkDrag, drop: CdkDropList<PlayerWithRanking[]>) => {
    const service = this.dataService;
    return service.canDrop(item.data.id, item.data.gender, drop.id);
  };

  drop(event: CdkDragDrop<PlayerWithRanking[]>) {
    const service = this.dataService;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    if (
      event.container.id === 'playerList' &&
      event.container.data?.some((r) => r.id === event.item.data.id)
    ) {
      // Dropping back to pool — remove from source
      event.previousContainer.data.splice(event.previousIndex, 1);
      this.onAssemblyChanged();
      return;
    }

    if (event.previousContainer.id === 'playerList') {
      // From pool: check duplication rules
      const allSingles = [...service.single1(), ...service.single2(), ...service.single3(), ...service.single4()];
      const allDoubles = [...service.double1(), ...service.double2(), ...service.double3(), ...service.double4()];

      if (event.container.id.includes('single') && allSingles.some((p) => p.id === event.item.data.id)) {
        return;
      }
      if (event.container.id.includes('double') && allDoubles.filter((p) => p.id === event.item.data.id).length >= 2) {
        return;
      }

      copyArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }

    // Auto-remove from substitutes
    if (event.container.id !== 'substituteList') {
      service.substitutes.update((subs) => subs.filter((r) => r.id !== event.item.data.id));
    }

    this.onAssemblyChanged();
  }

  onAssemblyChanged() {
    const service = this.dataService;
    service.syncFormFromSlots();
    service.sortLists();
    service.validate();
  }

  // Mobile select handlers
  onSlotPlayerChange(slotId: string, index: number, player: PlayerWithRanking | null) {
    this.dataService.setSlotPlayer(slotId, index, player);
  }

  getAvailablePlayers(slotId: string, index?: number): PlayerWithRanking[] {
    return this.dataService.getAvailablePlayersForSlot(slotId, index);
  }

  // Player search for adding
  playerSuggestions = signal<PlayerWithRanking[]>([]);

  searchPlayer(event: { query: string }) {
    // This would typically search via GraphQL
    // For now, we filter from known players
    const query = event.query.toLowerCase();
    const service = this.dataService;
    const allPlayers = [
      ...service.players()[TeamMembershipType.REGULAR],
      ...service.players()[TeamMembershipType.BACKUP],
    ];
    this.playerSuggestions.set(
      allPlayers.filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)),
    );
  }

  addPlayer(player: Player) {
    this.dataService.addPlayer(player);
  }

  getSlotPlayers(slotId: string): PlayerWithRanking[] {
    return this.dataService.getSlotData(slotId);
  }

  getSlotPlayer(slotId: string, index: number): PlayerWithRanking | null {
    return this.dataService.getSlotData(slotId)[index] ?? null;
  }

  // Change team dialog
  hasEditPermission = computed(() => {
    const clubId = this.formGroup().get('club')?.value;
    if (!clubId) return false;
    return this.authService.hasAnyPermission([`${clubId}_edit:team`, 'edit-any:club']);
  });

  toggleAllPlayers(selected: boolean) {
    this.dataService.setAllPlayersAvailable(selected);
  }

  async generateAssembly(strategy: GenerateStrategy) {
    this.generating.set(true);
    try {
      await this.generatorService.generate({
        strategy,
        timeRange: this.selectedTimeRange(),
        weeks: this.selectedWeeks(),
      });
    } finally {
      this.generating.set(false);
    }
  }

  clearAssembly() {
    this.dataService.single1.set([]);
    this.dataService.single2.set([]);
    this.dataService.single3.set([]);
    this.dataService.single4.set([]);
    this.dataService.double1.set([]);
    this.dataService.double2.set([]);
    this.dataService.double3.set([]);
    this.dataService.double4.set([]);
    this.dataService.substitutes.set([]);
    this.dataService.syncFormFromSlots();
    this.dataService.validate();
  }
}
