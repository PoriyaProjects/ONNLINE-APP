import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChartsDialogComponent2 } from './charts-dialog.component';

describe('ChartsDialogComponent2', () => {
  let component: ChartsDialogComponent2;
  let fixture: ComponentFixture<ChartsDialogComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChartsDialogComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChartsDialogComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
