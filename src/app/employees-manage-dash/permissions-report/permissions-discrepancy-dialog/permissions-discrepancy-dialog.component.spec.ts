import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionsDiscrepancyDialogComponent } from './permissions-discrepancy-dialog.component';

describe('PermissionsDiscrepancyDialogComponent', () => {
  let component: PermissionsDiscrepancyDialogComponent;
  let fixture: ComponentFixture<PermissionsDiscrepancyDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PermissionsDiscrepancyDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PermissionsDiscrepancyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
