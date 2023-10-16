import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NutritionSystemComponent } from './nutrition-system.component';

describe('NutritionSystemComponent', () => {
  let component: NutritionSystemComponent;
  let fixture: ComponentFixture<NutritionSystemComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NutritionSystemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NutritionSystemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
