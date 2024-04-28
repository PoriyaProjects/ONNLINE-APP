import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SurgeriesUnclosedReportsComponent } from './surgeries-unclosed-reports.component';

describe('SurgeriesUnclosedReportsComponent', () => {
  let component: SurgeriesUnclosedReportsComponent;
  let fixture: ComponentFixture<SurgeriesUnclosedReportsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SurgeriesUnclosedReportsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SurgeriesUnclosedReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
