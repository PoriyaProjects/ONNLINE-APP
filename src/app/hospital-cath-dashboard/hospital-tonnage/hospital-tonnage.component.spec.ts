import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HospitalTonnageComponent2 } from './hospital-tonnage.component';

describe('HospitalTonnageComponent2', () => {
  let component: HospitalTonnageComponent2;
  let fixture: ComponentFixture<HospitalTonnageComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HospitalTonnageComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HospitalTonnageComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
