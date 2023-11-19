import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AddOrEditSwitchesComponent } from './add-or-edit-switches.component';

describe('AddOrEditSwitchesComponent', () => {
  let component: AddOrEditSwitchesComponent;
  let fixture: ComponentFixture<AddOrEditSwitchesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AddOrEditSwitchesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddOrEditSwitchesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
