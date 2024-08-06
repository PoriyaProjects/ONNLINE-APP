import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReHospComponent } from './re-hosp.component';

describe('ReHospComponent', () => {
  let component: ReHospComponent;
  let fixture: ComponentFixture<ReHospComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReHospComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReHospComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
