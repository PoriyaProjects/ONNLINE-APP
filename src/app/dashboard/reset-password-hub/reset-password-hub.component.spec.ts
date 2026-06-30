import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ResetPasswordHubComponent } from './reset-password-hub.component';

describe('ResetPasswordHubComponent', () => {
  let component: ResetPasswordHubComponent;
  let fixture: ComponentFixture<ResetPasswordHubComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ResetPasswordHubComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResetPasswordHubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
