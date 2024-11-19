import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SpreadsheetsDashboardComponent } from './spreadsheets-dashboard.component';

describe('SpreadsheetsDashboardComponent', () => {
  let component: SpreadsheetsDashboardComponent;
  let fixture: ComponentFixture<SpreadsheetsDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SpreadsheetsDashboardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SpreadsheetsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
