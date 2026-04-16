import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommercialSupportGatheringComponent } from './commercial-support-gathering.component';

describe('CommercialSupportGatheringComponent', () => {
  let component: CommercialSupportGatheringComponent;
  let fixture: ComponentFixture<CommercialSupportGatheringComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommercialSupportGatheringComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommercialSupportGatheringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
