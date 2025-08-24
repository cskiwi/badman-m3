import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlennComponent } from './glenn.component';

describe('GlennComponent', () => {
  let component: GlennComponent;
  let fixture: ComponentFixture<GlennComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlennComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GlennComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
