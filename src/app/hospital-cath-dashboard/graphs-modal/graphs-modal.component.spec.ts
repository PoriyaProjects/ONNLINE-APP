import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphsModalComponent2 } from './graphs-modal.component';

describe('GraphsModalComponent2', () => {
  let component: GraphsModalComponent2;
  let fixture: ComponentFixture<GraphsModalComponent2>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GraphsModalComponent2 ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphsModalComponent2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
