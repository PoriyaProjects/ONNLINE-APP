import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SessionCancelAdminDialogComponent } from '../dialogs/session-cancel-admin-dialog/session-cancel-admin-dialog.component';
import { ManualAttendanceDialogComponent } from '../dialogs/manual-attendance-dialog/manual-attendance-dialog.component';
import { AdminCancelRegistrationDialogComponent } from '../dialogs/admin-cancel-registration-dialog/admin-cancel-registration-dialog.component';

describe('Admin dialog validations', () => {
  describe('SessionCancelAdminDialogComponent', () => {
    let fixture: ComponentFixture<SessionCancelAdminDialogComponent>;
    let component: SessionCancelAdminDialogComponent;
    let ref: { close: jasmine.Spy };

    beforeEach(() => {
      ref = { close: jasmine.createSpy('close') };
      TestBed.configureTestingModule({
        imports: [
          FormsModule,
          NoopAnimationsModule,
          MatDialogModule,
          MatFormFieldModule,
          MatIconModule,
          MatInputModule,
          MatButtonModule,
        ],
        declarations: [SessionCancelAdminDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: ref },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              courseName: 'BLS',
              sessionDate: '2026-09-01',
              timeLabel: '10:00–12:00',
              location: 'אולם',
              registeredCount: 3,
            },
          },
        ],
      });
      fixture = TestBed.createComponent(SessionCancelAdminDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('requires cancel reason', () => {
      component.reason = '   ';
      component.confirm();
      expect(ref.close).not.toHaveBeenCalled();
      component.reason = 'ביטול מנהלי';
      component.confirm();
      expect(ref.close).toHaveBeenCalledWith({ confirmed: true, reason: 'ביטול מנהלי' });
    });
  });

  describe('ManualAttendanceDialogComponent', () => {
    let fixture: ComponentFixture<ManualAttendanceDialogComponent>;
    let component: ManualAttendanceDialogComponent;
    let ref: { close: jasmine.Spy };

    beforeEach(() => {
      ref = { close: jasmine.createSpy('close') };
      TestBed.configureTestingModule({
        imports: [
          FormsModule,
          NoopAnimationsModule,
          MatDialogModule,
          MatFormFieldModule,
          MatIconModule,
          MatInputModule,
          MatSelectModule,
          MatButtonModule,
        ],
        declarations: [ManualAttendanceDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: ref },
          {
            provide: MAT_DIALOG_DATA,
            useValue: { employeeName: 'ישראל', sessionLabel: 'BLS', currentAttendanceStatus: null },
          },
        ],
      });
      fixture = TestBed.createComponent(ManualAttendanceDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('requires reason for manual attendance', () => {
      component.reason = '';
      component.confirm();
      expect(ref.close).not.toHaveBeenCalled();
      component.reason = 'תיקון מנהלי';
      component.confirm();
      expect(ref.close).toHaveBeenCalledWith({
        confirmed: true,
        attended: true,
        reason: 'תיקון מנהלי',
      });
    });
  });

  describe('AdminCancelRegistrationDialogComponent', () => {
    let fixture: ComponentFixture<AdminCancelRegistrationDialogComponent>;
    let component: AdminCancelRegistrationDialogComponent;
    let ref: { close: jasmine.Spy };

    beforeEach(() => {
      ref = { close: jasmine.createSpy('close') };
      TestBed.configureTestingModule({
        imports: [
          FormsModule,
          NoopAnimationsModule,
          MatDialogModule,
          MatFormFieldModule,
          MatIconModule,
          MatInputModule,
          MatButtonModule,
        ],
        declarations: [AdminCancelRegistrationDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: ref },
          {
            provide: MAT_DIALOG_DATA,
            useValue: { employeeName: 'ישראל', courseName: 'BLS', sessionDate: '2026-09-01' },
          },
        ],
      });
      fixture = TestBed.createComponent(AdminCancelRegistrationDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('requires cancel registration reason', () => {
      component.reason = '';
      component.confirm();
      expect(ref.close).not.toHaveBeenCalled();
      component.reason = 'ביטול מנהלי';
      component.confirm();
      expect(ref.close).toHaveBeenCalledWith({ confirmed: true, reason: 'ביטול מנהלי' });
    });
  });
});
