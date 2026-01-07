import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WindowsUserActionsComponent } from './windows-user-actions.component';

describe('WindowsUserActionsComponent', () => {
  let component: WindowsUserActionsComponent;
  let fixture: ComponentFixture<WindowsUserActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WindowsUserActionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WindowsUserActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
