import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CprNewbornFormComponent } from './cpr-newborn-form.component';

describe('CprNewbornFormComponent', () => {
  let component: CprNewbornFormComponent;
  let fixture: ComponentFixture<CprNewbornFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CprNewbornFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CprNewbornFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
