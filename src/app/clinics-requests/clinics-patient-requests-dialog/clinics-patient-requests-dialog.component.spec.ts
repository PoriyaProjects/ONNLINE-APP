import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicsPatientRequestsDialogComponent } from './clinics-patient-requests-dialog.component';

describe('ClinicsPatientRequestsDialogComponent', () => {
  let component: ClinicsPatientRequestsDialogComponent;
  let fixture: ComponentFixture<ClinicsPatientRequestsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClinicsPatientRequestsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicsPatientRequestsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
