import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Entry, TournamentDraw, TournamentEvent, TournamentSubEvent } from '@app/models';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DrawsTabService, SeedingMethod } from './draws-tab.service';

@Component({
  selector: 'app-draws-tab',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    MessageModule,
    ProgressBarModule,
    DialogModule,
    TooltipModule,
    CheckboxModule,
  ],
  templateUrl: './draws-tab.component.html',
  styleUrl: './draws-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawsTabComponent {
  tournament = input.required<TournamentEvent>();

  private readonly dataService = new DrawsTabService();

  // Form controls
  subEventControl = new FormControl<TournamentSubEvent | null>(null);

  // New draw dialog
  showCreateDrawDialog = signal(false);
  drawForm = new FormGroup({
    name: new FormControl<string>('', Validators.required),
    type: new FormControl<string>('KO', Validators.required),
    size: new FormControl<number | null>(null),
  });

  // Seeding dialog
  showSeedingDialog = signal(false);
  seedingDrawId = signal<string | null>(null);
  seedingMethod = new FormControl<SeedingMethod>('BY_RANKING');

  // Entry selection
  selectedEntries = signal<Entry[]>([]);
  targetDrawId = signal<string | null>(null);

  // Data
  entries = this.dataService.entries;
  unassignedEntries = this.dataService.unassignedEntries;
  draws = this.dataService.draws;
  loading = this.dataService.loading;
  error = this.dataService.error;
  updating = this.dataService.updating;
  updateError = this.dataService.updateError;
  stats = this.dataService.stats;

  // Selected sub-event
  selectedSubEvent = signal<TournamentSubEvent | null>(null);

  // Sub-events list
  subEvents = computed(() => this.tournament()?.tournamentSubEvents ?? []);

  // Draw type options
  readonly drawTypeOptions = [
    { label: 'Knockout', value: 'KO' },
    { label: 'Poule/Round Robin', value: 'POULE' },
    { label: 'Qualification', value: 'QUALIFICATION' },
  ];

  // Seeding method options
  readonly seedingMethodOptions = [
    { label: 'By Ranking', value: 'BY_RANKING' as SeedingMethod },
    { label: 'Random', value: 'RANDOM' as SeedingMethod },
    { label: 'Manual', value: 'MANUAL' as SeedingMethod },
  ];

  // Draw size options for KO
  readonly drawSizeOptions = [4, 8, 16, 32, 64].map((size) => ({ label: `${size} entries`, value: size }));

  constructor() {
    // Watch sub-event selection
    effect(() => {
      const subEvent = this.subEventControl.value;
      if (subEvent) {
        this.selectedSubEvent.set(subEvent);
        this.dataService.filter.patchValue({
          subEventId: subEvent.id,
        });
        // Clear selections when changing sub-event
        this.selectedEntries.set([]);
        this.targetDrawId.set(null);
      }
    });

    // Auto-select first sub-event
    effect(() => {
      const subEvents = this.subEvents();
      if (subEvents.length > 0 && !this.selectedSubEvent()) {
        this.subEventControl.setValue(subEvents[0]);
      }
    });
  }

  isDoublesEvent(): boolean {
    const subEvent = this.selectedSubEvent();
    return subEvent?.gameType === 'D' || subEvent?.gameType === 'MX';
  }

  getEntryName(entry: Entry): string {
    const player1Name = entry.player1?.fullName ?? 'Unknown';
    if (this.isDoublesEvent() && entry.player2) {
      return `${player1Name} / ${entry.player2.fullName}`;
    }
    return player1Name;
  }

  getDrawTypeSeverity(type?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (type) {
      case 'KO':
        return 'success';
      case 'POULE':
        return 'info';
      case 'QUALIFICATION':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  // Entry selection handlers
  isEntrySelected(entry: Entry): boolean {
    return this.selectedEntries().some((e) => e.id === entry.id);
  }

  toggleEntrySelection(entry: Entry): void {
    const current = this.selectedEntries();
    if (this.isEntrySelected(entry)) {
      this.selectedEntries.set(current.filter((e) => e.id !== entry.id));
    } else {
      this.selectedEntries.set([...current, entry]);
    }
  }

  selectAllUnassigned(): void {
    this.selectedEntries.set([...this.unassignedEntries()]);
  }

  clearSelection(): void {
    this.selectedEntries.set([]);
  }

  // Actions
  async generateEntries(): Promise<void> {
    const subEvent = this.selectedSubEvent();
    if (!subEvent) return;

    const hasEntries = this.entries().length > 0;
    if (hasEntries) {
      if (!confirm('Entries already exist. Do you want to regenerate them? This will remove existing entries.')) {
        return;
      }
    }

    await this.dataService.generateEntries(subEvent.id, hasEntries);
  }

  openCreateDrawDialog(): void {
    this.drawForm.reset({ type: 'KO' });
    this.showCreateDrawDialog.set(true);
  }

  async createDraw(): Promise<void> {
    if (!this.drawForm.valid) return;

    const subEvent = this.selectedSubEvent();
    if (!subEvent) return;

    const { name, type, size } = this.drawForm.value;
    const result = await this.dataService.createDraw(subEvent.id, name!, type!, size ?? undefined);

    if (result) {
      this.showCreateDrawDialog.set(false);
    }
  }

  async deleteDraw(draw: TournamentDraw): Promise<void> {
    if (!confirm(`Are you sure you want to delete draw "${draw.name}"? Entries will be unassigned but not deleted.`)) {
      return;
    }
    await this.dataService.deleteDraw(draw.id);
  }

  async assignSelectedToDraw(): Promise<void> {
    const drawId = this.targetDrawId();
    if (!drawId) return;

    const entryIds = this.selectedEntries().map((e) => e.id);
    if (entryIds.length === 0) return;

    const success = await this.dataService.assignEntriesToDraw(entryIds, drawId);
    if (success) {
      this.selectedEntries.set([]);
      this.targetDrawId.set(null);
    }
  }

  async removeFromDraw(entry: Entry): Promise<void> {
    await this.dataService.removeEntryFromDraw(entry.id);
  }

  // Seeding
  openSeedingDialog(draw: TournamentDraw): void {
    this.seedingDrawId.set(draw.id);
    this.seedingMethod.setValue('BY_RANKING');
    this.showSeedingDialog.set(true);
  }

  async applySeeding(): Promise<void> {
    const drawId = this.seedingDrawId();
    const method = this.seedingMethod.value;
    if (!drawId || !method) return;

    const success = await this.dataService.autoSeedDraw(drawId, method);
    if (success) {
      this.showSeedingDialog.set(false);
    }
  }

  async clearSeeds(draw: TournamentDraw): Promise<void> {
    if (!confirm('Are you sure you want to clear all seeds from this draw?')) return;
    await this.dataService.clearDrawSeeds(draw.id);
  }

  refetch(): void {
    this.dataService.refetch();
  }
}
