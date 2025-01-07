import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CliniDataComponent } from './clini-data.component';

describe('CliniDataComponent', () => {
  let component: CliniDataComponent;
  let fixture: ComponentFixture<CliniDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CliniDataComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CliniDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
