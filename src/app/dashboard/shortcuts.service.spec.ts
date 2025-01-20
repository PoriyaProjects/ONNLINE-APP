import { TestBed } from '@angular/core/testing';

import { ShortcutsService } from './shortcuts-management/shortcuts.service';

describe('ShortcutsService', () => {
  let service: ShortcutsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShortcutsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
