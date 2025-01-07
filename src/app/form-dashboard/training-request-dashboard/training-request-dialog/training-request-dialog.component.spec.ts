import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainingRequestDialogComponent } from './training-request-dialog.component';

describe('TrainingRequestDialogComponent', () => {
  let component: TrainingRequestDialogComponent;
  let fixture: ComponentFixture<TrainingRequestDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TrainingRequestDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainingRequestDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
