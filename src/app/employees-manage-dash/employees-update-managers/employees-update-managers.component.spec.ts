import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EmployeesUpdateManagersComponent } from './employees-update-managers.component';

describe('EmployeesUpdateManagersComponent', () => {
  let component: EmployeesUpdateManagersComponent;
  let fixture: ComponentFixture<EmployeesUpdateManagersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EmployeesUpdateManagersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EmployeesUpdateManagersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
