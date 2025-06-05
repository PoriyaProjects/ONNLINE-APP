import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceUnitEmailListDialogComponent } from './service-unit-email-list-dialog.component';

describe('ServiceUnitEmailListDialogComponent', () => {
  let component: ServiceUnitEmailListDialogComponent;
  let fixture: ComponentFixture<ServiceUnitEmailListDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ServiceUnitEmailListDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceUnitEmailListDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
