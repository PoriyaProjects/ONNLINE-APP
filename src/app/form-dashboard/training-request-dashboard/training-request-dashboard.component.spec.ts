import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingRequestDashboardComponent } from './training-request-dashboard.component';

describe('TrainingRequestDashboardComponent', () => {
  let component: TrainingRequestDashboardComponent;
  let fixture: ComponentFixture<TrainingRequestDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TrainingRequestDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainingRequestDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
