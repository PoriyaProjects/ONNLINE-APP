import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOrAddLabTestsComponent } from './edit-or-add-lab-tests.component';

describe('EditOrAddLabTestsComponent', () => {
  let component: EditOrAddLabTestsComponent;
  let fixture: ComponentFixture<EditOrAddLabTestsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditOrAddLabTestsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditOrAddLabTestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
