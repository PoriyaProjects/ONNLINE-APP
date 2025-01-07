import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DepartmentsWhatsappManagementComponent } from './departments-whatsapp-management.component';

describe('DepartmentsWhatsappManagementComponent', () => {
  let component: DepartmentsWhatsappManagementComponent;
  let fixture: ComponentFixture<DepartmentsWhatsappManagementComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DepartmentsWhatsappManagementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DepartmentsWhatsappManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
