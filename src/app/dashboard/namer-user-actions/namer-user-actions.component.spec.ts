import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NamerUserActionsComponent } from './namer-user-actions.component';

describe('NamerUserActionsComponent', () => {
  let component: NamerUserActionsComponent;
  let fixture: ComponentFixture<NamerUserActionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NamerUserActionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NamerUserActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
