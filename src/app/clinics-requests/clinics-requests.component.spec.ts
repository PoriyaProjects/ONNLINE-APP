import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClinicsRequestsComponent } from './clinics-requests.component';

describe('ClinicsRequestsComponent', () => {
  let component: ClinicsRequestsComponent;
  let fixture: ComponentFixture<ClinicsRequestsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClinicsRequestsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClinicsRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
