import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BTirmComponent } from './b-tirm.component';

describe('BTirmComponent', () => {
  let component: BTirmComponent;
  let fixture: ComponentFixture<BTirmComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BTirmComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BTirmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
