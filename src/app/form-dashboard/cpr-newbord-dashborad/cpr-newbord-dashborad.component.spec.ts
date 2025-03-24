import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CprNewbordDashboradComponent } from './cpr-newbord-dashborad.component';

describe('CprNewbordDashboradComponent', () => {
  let component: CprNewbordDashboradComponent;
  let fixture: ComponentFixture<CprNewbordDashboradComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CprNewbordDashboradComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CprNewbordDashboradComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
