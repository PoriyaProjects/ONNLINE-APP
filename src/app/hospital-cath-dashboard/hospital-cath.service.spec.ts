import { TestBed } from '@angular/core/testing';

import { HospitalBiService2 } from './hospital-cath.service';

describe('HospitalBiService2', () => {
  let service: HospitalBiService2;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HospitalBiService2);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
