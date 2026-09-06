import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmationDialogService } from '../../confirmation-dialog/confirmation-dialog.service';
import { BedsoreDashboardComponent } from './bedsore-dashboard.component';
import { BedsoreService } from './bedsore.service';

describe('BedsoreDashboardComponent', () => {
  let component: BedsoreDashboardComponent;
  let fixture: ComponentFixture<BedsoreDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, MatDialogModule, MatSnackBarModule, NoopAnimationsModule],
      declarations: [BedsoreDashboardComponent],
      providers: [
        BedsoreService,
        { provide: ConfirmationDialogService, useValue: { confirm: () => Promise.resolve(false) } }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BedsoreDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
