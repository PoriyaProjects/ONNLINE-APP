import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AiLettersDashboardComponent } from './ai-letters-dashboard.component';

describe('AiLettersDashboardComponent', () => {
  let component: AiLettersDashboardComponent;
  let fixture: ComponentFixture<AiLettersDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AiLettersDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AiLettersDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
