import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { GoogleChartsModule } from 'angular-google-charts';
import { MaterialModule } from '../core/material.module';
import { RehabilitationDashboardComponent } from './rehabilitation-dashboard.component';

describe('RehabilitationDashboardComponent', () => {
  let component: RehabilitationDashboardComponent;
  let fixture: ComponentFixture<RehabilitationDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RehabilitationDashboardComponent],
      imports: [FormsModule, GoogleChartsModule, MaterialModule],
    }).compileComponents();

    fixture = TestBed.createComponent(RehabilitationDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
