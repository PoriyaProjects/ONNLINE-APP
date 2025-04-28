import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EshpozModalComponent2 } from './eshpoz-modal.component';

describe('EshpozModalComponent2', () => {
  let component: EshpozModalComponent2;
  let fixture: ComponentFixture<EshpozModalComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EshpozModalComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EshpozModalComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
