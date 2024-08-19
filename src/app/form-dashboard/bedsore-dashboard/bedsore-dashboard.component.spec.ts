import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BedsoreDashboardComponent } from './bedsore-dashboard.component';

describe('BedsoreDashboardComponent', () => {
  let component: BedsoreDashboardComponent;
  let fixture: ComponentFixture<BedsoreDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BedsoreDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BedsoreDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
