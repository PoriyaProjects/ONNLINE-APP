import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalInternsDashboardComponent } from './medical-interns-dashboard.component';

describe('MedicalInternsDashboardComponent', () => {
  let component: MedicalInternsDashboardComponent;
  let fixture: ComponentFixture<MedicalInternsDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MedicalInternsDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicalInternsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
