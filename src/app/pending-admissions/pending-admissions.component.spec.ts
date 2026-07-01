import { ComponentFixture, TestBed, async } from '@angular/core/testing';

import { PendingAdmissionsComponent } from './pending-admissions.component';

describe('PendingAdmissionsComponent', () => {
  let component: PendingAdmissionsComponent;
  let fixture: ComponentFixture<PendingAdmissionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PendingAdmissionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PendingAdmissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
