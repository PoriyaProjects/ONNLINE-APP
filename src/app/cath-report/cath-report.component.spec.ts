import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CathReportComponent } from './cath-report.component';

describe('CathReportComponent', () => {
  let component: CathReportComponent;
  let fixture: ComponentFixture<CathReportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CathReportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CathReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
