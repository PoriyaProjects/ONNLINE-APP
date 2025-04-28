import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialSupportFormDialogComponent } from './commercial-support-form-dialog.component';

describe('CommercialSupportFormDialogComponent', () => {
  let component: CommercialSupportFormDialogComponent;
  let fixture: ComponentFixture<CommercialSupportFormDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommercialSupportFormDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommercialSupportFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
