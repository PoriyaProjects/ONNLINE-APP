import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportReportingComponent } from './report-reporting.component';

describe('ReportReportingComponent', () => {
  let component: ReportReportingComponent;
  let fixture: ComponentFixture<ReportReportingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReportReportingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportReportingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
