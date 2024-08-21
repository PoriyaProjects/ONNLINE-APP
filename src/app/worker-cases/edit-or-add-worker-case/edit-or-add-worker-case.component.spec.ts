import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOrAddWorkerCaseComponent } from './edit-or-add-worker-case.component';

describe('EditOrAddWorkerCaseComponent', () => {
  let component: EditOrAddWorkerCaseComponent;
  let fixture: ComponentFixture<EditOrAddWorkerCaseComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditOrAddWorkerCaseComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditOrAddWorkerCaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
