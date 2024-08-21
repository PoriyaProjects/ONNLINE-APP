import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOrAddWorkerCaseDialogComponent } from './edit-or-add-worker-case-dialog.component';

describe('EditOrAddWorkerCaseDialogComponent', () => {
  let component: EditOrAddWorkerCaseDialogComponent;
  let fixture: ComponentFixture<EditOrAddWorkerCaseDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditOrAddWorkerCaseDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditOrAddWorkerCaseDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
