import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HearingSurveyComponent } from './hearing-survey.component';

describe('HearingSurveyComponent', () => {
  let component: HearingSurveyComponent;
  let fixture: ComponentFixture<HearingSurveyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HearingSurveyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HearingSurveyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
