import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OpenAttendanceDialogComponent } from './open-attendance-dialog.component';
import { CloseAttendanceDialogComponent } from '../close-attendance-dialog/close-attendance-dialog.component';
import { CompleteSessionDialogComponent } from '../complete-session-dialog/complete-session-dialog.component';

describe('Lecturer attendance dialogs', () => {
  describe('OpenAttendanceDialogComponent', () => {
    let fixture: ComponentFixture<OpenAttendanceDialogComponent>;
    let component: OpenAttendanceDialogComponent;
    let ref: { close: jasmine.Spy };

    beforeEach(() => {
      ref = { close: jasmine.createSpy('close') };
      TestBed.configureTestingModule({
        imports: [NoopAnimationsModule, MatDialogModule, MatButtonModule],
        declarations: [OpenAttendanceDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: ref },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              courseName: 'BLS',
              sessionDate: '2026-09-01',
              timeLabel: '10:00–12:00',
              currentTimeLabel: '2026-09-01T09:55:00',
              windowHint: '',
            },
          },
        ],
      });
      fixture = TestBed.createComponent(OpenAttendanceDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('prevents duplicate confirm', () => {
      component.confirm();
      expect(ref.close).toHaveBeenCalledWith(true);
      component.confirm();
      expect(ref.close.calls.count()).toBe(1);
    });
  });

  describe('CloseAttendanceDialogComponent', () => {
    let fixture: ComponentFixture<CloseAttendanceDialogComponent>;
    let component: CloseAttendanceDialogComponent;
    let ref: { close: jasmine.Spy };

    beforeEach(() => {
      ref = { close: jasmine.createSpy('close') };
      TestBed.configureTestingModule({
        imports: [NoopAnimationsModule, MatDialogModule, MatButtonModule],
        declarations: [CloseAttendanceDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: ref },
          {
            provide: MAT_DIALOG_DATA,
            useValue: { courseName: 'BLS', registered: 10, confirmed: 4, remaining: 6 },
          },
        ],
      });
      fixture = TestBed.createComponent(CloseAttendanceDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('confirms close once', () => {
      component.confirm();
      expect(ref.close).toHaveBeenCalledWith(true);
      component.confirm();
      expect(ref.close.calls.count()).toBe(1);
    });
  });

  describe('CompleteSessionDialogComponent', () => {
    let fixture: ComponentFixture<CompleteSessionDialogComponent>;
    let component: CompleteSessionDialogComponent;
    let ref: { close: jasmine.Spy };

    beforeEach(() => {
      ref = { close: jasmine.createSpy('close') };
      TestBed.configureTestingModule({
        imports: [NoopAnimationsModule, MatDialogModule, MatButtonModule],
        declarations: [CompleteSessionDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: ref },
          {
            provide: MAT_DIALOG_DATA,
            useValue: {
              courseName: 'BLS',
              sessionDate: '2026-09-01',
              registered: 10,
              confirmed: 8,
              missing: 2,
            },
          },
        ],
      });
      fixture = TestBed.createComponent(CompleteSessionDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('confirms complete once', () => {
      component.confirm();
      expect(ref.close).toHaveBeenCalledWith(true);
      component.confirm();
      expect(ref.close.calls.count()).toBe(1);
    });
  });
});
