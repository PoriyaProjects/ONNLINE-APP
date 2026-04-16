import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EmergencyRoomReportComponent } from './emergency-room-report.component';
import { DatePipe } from '@angular/common';

describe('EmergencyRoomReportComponent', () => {
  let component: EmergencyRoomReportComponent;
  let fixture: ComponentFixture<EmergencyRoomReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmergencyRoomReportComponent],
      imports: [HttpClientTestingModule],
      providers: [DatePipe]
    }).compileComponents();

    fixture = TestBed.createComponent(EmergencyRoomReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
