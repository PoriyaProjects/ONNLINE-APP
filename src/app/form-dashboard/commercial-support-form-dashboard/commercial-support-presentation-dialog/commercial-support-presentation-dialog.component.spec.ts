import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialSupportPresentationDialogComponent } from './commercial-support-presentation-dialog.component';

describe('CommercialSupportPresentationDialogComponent', () => {
  let component: CommercialSupportPresentationDialogComponent;
  let fixture: ComponentFixture<CommercialSupportPresentationDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommercialSupportPresentationDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommercialSupportPresentationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
