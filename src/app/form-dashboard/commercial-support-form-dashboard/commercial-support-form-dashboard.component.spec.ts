import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialSupportFormDashboardComponent } from './commercial-support-form-dashboard.component';

describe('CommercialSupportFormDashboardComponent', () => {
  let component: CommercialSupportFormDashboardComponent;
  let fixture: ComponentFixture<CommercialSupportFormDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommercialSupportFormDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommercialSupportFormDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
