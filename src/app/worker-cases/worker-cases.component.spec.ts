import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkerCasesComponent } from './worker-cases.component';

describe('WorkerCasesComponent', () => {
  let component: WorkerCasesComponent;
  let fixture: ComponentFixture<WorkerCasesComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WorkerCasesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkerCasesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
