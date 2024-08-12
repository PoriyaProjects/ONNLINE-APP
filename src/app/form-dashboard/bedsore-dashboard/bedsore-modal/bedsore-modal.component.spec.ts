import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BedsoreModalComponent } from './bedsore-modal.component';

describe('BedsoreModalComponent', () => {
  let component: BedsoreModalComponent;
  let fixture: ComponentFixture<BedsoreModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BedsoreModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BedsoreModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
