import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicsRequestsDialogComponent } from './clinics-requests-dialog.component';

describe('ClinicsRequestsDialogComponent', () => {
  let component: ClinicsRequestsDialogComponent;
  let fixture: ComponentFixture<ClinicsRequestsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClinicsRequestsDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicsRequestsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
