import { TestBed } from '@angular/core/testing';

import { CommercialSupportService } from './commercial-support.service';

describe('CommercialSupportService', () => {
  let service: CommercialSupportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommercialSupportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
