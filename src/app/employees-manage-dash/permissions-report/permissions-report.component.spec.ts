import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionsReportComponent } from './permissions-report.component';

describe('PermissionsReportComponent', () => {
  let component: PermissionsReportComponent;
  let fixture: ComponentFixture<PermissionsReportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PermissionsReportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PermissionsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
