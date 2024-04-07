import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientStikersComponent } from './patient-stikers.component';

describe('PatientStikersComponent', () => {
  let component: PatientStikersComponent;
  let fixture: ComponentFixture<PatientStikersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PatientStikersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientStikersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
