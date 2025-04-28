import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupedBarChartReleaseComponent2 } from './grouped-bar-chart-release.component';

describe('GroupedBarChartReleaseComponent2', () => {
  let component: GroupedBarChartReleaseComponent2;
  let fixture: ComponentFixture<GroupedBarChartReleaseComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupedBarChartReleaseComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupedBarChartReleaseComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
