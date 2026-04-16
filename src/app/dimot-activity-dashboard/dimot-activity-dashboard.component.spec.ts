import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DimotActivityDashboardComponent } from './dimot-activity-dashboard.component';

describe('DimotActivityDashboardComponent', () => {
  let component: DimotActivityDashboardComponent;
  let fixture: ComponentFixture<DimotActivityDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DimotActivityDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DimotActivityDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
