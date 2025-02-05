import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LearningRequestsDashboardComponent } from './learning-requests-dashboard.component';

describe('LearningRequestsDashboardComponent', () => {
  let component: LearningRequestsDashboardComponent;
  let fixture: ComponentFixture<LearningRequestsDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LearningRequestsDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LearningRequestsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
