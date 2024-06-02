import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientsSystemConflictsComponent } from './patients-system-conflicts.component';

describe('PatientsSystemConflictsComponent', () => {
  let component: PatientsSystemConflictsComponent;
  let fixture: ComponentFixture<PatientsSystemConflictsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PatientsSystemConflictsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientsSystemConflictsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
