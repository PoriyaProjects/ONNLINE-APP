import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { HospitalCurrentPatientsService } from './hospital-current-patients.service';
import { environment } from 'src/environments/environment';

describe('HospitalCurrentPatientsService', () => {
  let service: HospitalCurrentPatientsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HospitalCurrentPatientsService]
    });
    service = TestBed.inject(HospitalCurrentPatientsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch current patients', (done) => {
    const mockData = [
      {
        PatientId: '123456',
        FirstName: 'יוסי',
        LastName: 'כהן',
        CaseNumber: 'C001',
        CaseTypeName: 'אשפוז',
        ActiveDepartmentGroup: 'קרדיולוגיה',
        TotalRows: 1
      }
    ];

    service.fetchCurrentPatients({
      viewMode: 'DEPART',
      departmentFilter: '',
      caseTypeFilter: 'ALL',
      onlyDangerCases: false,
      onlyAranCases: false,
      freeSearch: '',
      pageIndex: 0,
      pageSize: 10
    }).subscribe(result => {
      expect(result.length).toBe(1);
      expect(result[0].FirstName).toBe('יוסי');
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('FetchCurrentHospitalPatients'));
    expect(req.request.method).toBe('POST');
    req.flush({ d: mockData });
  });

  it('should fetch department summary', (done) => {
    const mockData = [
      {
        DepartmentKey: 'CARDIO',
        ViewMode: 'DEPART',
        TotalPatients: 10,
        EshpozCount: 5,
        ClinicsCount: 3,
        MiyunCount: 2,
        DangerCasesCount: 1,
        AranCasesCount: 0,
        TemporaryLeaveCount: 0
      }
    ];

    service.fetchDepartmentSummary('DEPART').subscribe(result => {
      expect(result.length).toBe(1);
      expect(result[0].TotalPatients).toBe(10);
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('FetchDepartmentSummary'));
    expect(req.request.method).toBe('POST');
    req.flush({ d: mockData });
  });

  it('should handle ASMX { d: ... } wrapping', (done) => {
    const mockData = { d: 'active' };

    service.fetchMonitoringSyncState().subscribe(result => {
      expect(result).toEqual('active');
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('FetchMonitoringSyncState'));
    req.flush(mockData);
  });
});
