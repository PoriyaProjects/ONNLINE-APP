import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerStatusDialogComponent } from './manager-status-dialog.component';

describe('ManagerStatusDialogComponent', () => {
  let component: ManagerStatusDialogComponent;
  let fixture: ComponentFixture<ManagerStatusDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ManagerStatusDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManagerStatusDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
