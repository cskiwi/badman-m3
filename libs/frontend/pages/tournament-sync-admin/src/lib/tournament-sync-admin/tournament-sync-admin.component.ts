import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-tournament-sync-admin',
  imports: [CommonModule, TranslateModule],
  templateUrl: './tournament-sync-admin.component.html',
  styleUrl: './tournament-sync-admin.component.scss',
})
export class TournamentSyncAdminComponent {}
