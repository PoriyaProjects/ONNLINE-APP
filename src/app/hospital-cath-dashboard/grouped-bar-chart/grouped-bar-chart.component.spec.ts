import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupedBarChartComponent2 } from './grouped-bar-chart.component';

describe('GroupedBarChartComponent2', () => {
  let component: GroupedBarChartComponent2;
  let fixture: ComponentFixture<GroupedBarChartComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupedBarChartComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupedBarChartComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
