import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InjuryReportComponent } from './injury-report.component';

describe('InjuryReportComponent', () => {
  let component: InjuryReportComponent;
  let fixture: ComponentFixture<InjuryReportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InjuryReportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InjuryReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
