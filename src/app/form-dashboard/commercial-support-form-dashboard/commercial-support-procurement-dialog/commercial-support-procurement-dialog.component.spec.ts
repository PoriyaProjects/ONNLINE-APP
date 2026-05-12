import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialSupportProcurementDialogComponent } from './commercial-support-procurement-dialog.component';

describe('CommercialSupportProcurementDialogComponent', () => {
  let component: CommercialSupportProcurementDialogComponent;
  let fixture: ComponentFixture<CommercialSupportProcurementDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommercialSupportProcurementDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommercialSupportProcurementDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
