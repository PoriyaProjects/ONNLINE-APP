import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NewbornDashboardComponent } from './newborn-dashboard.component';

describe('NewbornDashboardComponent', () => {
  let component: NewbornDashboardComponent;
  let fixture: ComponentFixture<NewbornDashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [NewbornDashboardComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewbornDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
