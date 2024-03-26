import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NortonEstimateComponent } from './norton-estimate.component';

describe('NortonEstimateComponent', () => {
  let component: NortonEstimateComponent;
  let fixture: ComponentFixture<NortonEstimateComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NortonEstimateComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NortonEstimateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
