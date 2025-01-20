import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShortcutFormDialogComponent } from './shortcut-form-dialog.component';

describe('ShortcutFormDialogComponent', () => {
  let component: ShortcutFormDialogComponent;
  let fixture: ComponentFixture<ShortcutFormDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShortcutFormDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ShortcutFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
