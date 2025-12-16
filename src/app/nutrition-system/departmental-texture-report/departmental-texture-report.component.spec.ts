import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentalTextureReportComponent } from './departmental-texture-report.component';

describe('DepartmentalTextureReportComponent', () => {
  let component: DepartmentalTextureReportComponent;
  let fixture: ComponentFixture<DepartmentalTextureReportComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DepartmentalTextureReportComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DepartmentalTextureReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
