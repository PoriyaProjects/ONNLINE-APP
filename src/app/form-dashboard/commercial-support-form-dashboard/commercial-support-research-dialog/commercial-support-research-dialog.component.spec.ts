import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialSupportResearchDialogComponent } from './commercial-support-research-dialog.component';

describe('CommercialSupportResearchDialogComponent', () => {
  let component: CommercialSupportResearchDialogComponent;
  let fixture: ComponentFixture<CommercialSupportResearchDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommercialSupportResearchDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommercialSupportResearchDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
