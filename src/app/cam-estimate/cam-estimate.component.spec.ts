import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CAMEstimateComponent } from './cam-estimate.component';

describe('CAMEstimateComponent', () => {
  let component: CAMEstimateComponent;
  let fixture: ComponentFixture<CAMEstimateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CAMEstimateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CAMEstimateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
