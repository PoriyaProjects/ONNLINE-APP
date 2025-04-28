import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HospitalCathDashboardComponent } from './hospital-cath-dashboard.component';

describe('HospitalCathDashboardComponent', () => {
  let component: HospitalCathDashboardComponent;
  let fixture: ComponentFixture<HospitalCathDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HospitalCathDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HospitalCathDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
