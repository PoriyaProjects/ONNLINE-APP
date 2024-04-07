import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialysisReportComponent } from './dialysis-report.component';

describe('NortonEstimateComponent', () => {
  let component: DialysisReportComponent;
  let fixture: ComponentFixture<DialysisReportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialysisReportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialysisReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
