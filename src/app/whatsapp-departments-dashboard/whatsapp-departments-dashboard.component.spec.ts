import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappDepartmentsDashboardComponent } from './whatsapp-departments-dashboard.component';

describe('WhatsappDepartmentsDashboardComponent', () => {
  let component: WhatsappDepartmentsDashboardComponent;
  let fixture: ComponentFixture<WhatsappDepartmentsDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WhatsappDepartmentsDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WhatsappDepartmentsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
