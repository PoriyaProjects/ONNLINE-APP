import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ImagingPerformanceDashboardService } from './imaging-performance-dashboard.service';

describe('ImagingPerformanceDashboardService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ImagingPerformanceDashboardService],
    });
  });

  it('should be created', () => {
    const svc = TestBed.inject(ImagingPerformanceDashboardService);
    expect(svc).toBeTruthy();
  });
});
