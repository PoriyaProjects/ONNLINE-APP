import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceUnitEmailListComponent } from './service-unit-email-list.component';

describe('ServiceUnitEmailListComponent', () => {
  let component: ServiceUnitEmailListComponent;
  let fixture: ComponentFixture<ServiceUnitEmailListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ServiceUnitEmailListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceUnitEmailListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
