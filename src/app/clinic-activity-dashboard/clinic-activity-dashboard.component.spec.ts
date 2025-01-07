import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicActivityDashboardComponent } from './clinic-activity-dashboard.component';

describe('ClinicActivityDashboardComponent', () => {
  let component: ClinicActivityDashboardComponent;
  let fixture: ComponentFixture<ClinicActivityDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClinicActivityDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicActivityDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
