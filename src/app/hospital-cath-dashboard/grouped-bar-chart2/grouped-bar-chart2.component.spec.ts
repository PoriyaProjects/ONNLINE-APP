import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupedBarChart2Component2 } from './grouped-bar-chart2.component';

describe('GroupedBarChart2Component2', () => {
  let component: GroupedBarChart2Component2;
  let fixture: ComponentFixture<GroupedBarChart2Component2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GroupedBarChart2Component2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupedBarChart2Component2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
