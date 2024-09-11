import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEditAuthorizedComponent } from './add-edit-authorized.component';

describe('AddEditAuthorizedComponent', () => {
  let component: AddEditAuthorizedComponent;
  let fixture: ComponentFixture<AddEditAuthorizedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddEditAuthorizedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddEditAuthorizedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
