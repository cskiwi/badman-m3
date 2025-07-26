import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TournamentSyncAdminComponent } from './tournament-sync-admin.component';

describe('TournamentSyncAdminComponent', () => {
  let component: TournamentSyncAdminComponent;
  let fixture: ComponentFixture<TournamentSyncAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentSyncAdminComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentSyncAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
