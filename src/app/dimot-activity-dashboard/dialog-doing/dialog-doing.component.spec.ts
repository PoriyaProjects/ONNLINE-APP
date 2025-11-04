import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogDoingComponent } from './dialog-doing.component';

describe('DialogDoingComponent', () => {
  let component: DialogDoingComponent;
  let fixture: ComponentFixture<DialogDoingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DialogDoingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DialogDoingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
