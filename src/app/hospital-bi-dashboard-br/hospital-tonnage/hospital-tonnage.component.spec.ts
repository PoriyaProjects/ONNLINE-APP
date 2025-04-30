import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HospitalTonnageComponent } from './hospital-tonnage.component';

describe('HospitalTonnageComponent', () => {
  let component: HospitalTonnageComponent;
  let fixture: ComponentFixture<HospitalTonnageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HospitalTonnageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HospitalTonnageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
