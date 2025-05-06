import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GenhdashboardComponent } from './genhdashboard.component';

describe('GenhdashboardComponent', () => {
  let component: GenhdashboardComponent;
  let fixture: ComponentFixture<GenhdashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GenhdashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GenhdashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
