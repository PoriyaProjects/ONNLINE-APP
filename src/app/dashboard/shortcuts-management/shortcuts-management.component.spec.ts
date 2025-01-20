import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShortcutsManagementComponent } from './shortcuts-management.component';

describe('ShortcutsManagementComponent', () => {
  let component: ShortcutsManagementComponent;
  let fixture: ComponentFixture<ShortcutsManagementComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShortcutsManagementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShortcutsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
