import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MoneyLoaderComponent } from './money-loader.component';

describe('MoneyLoaderComponent', () => {
  let component: MoneyLoaderComponent;
  let fixture: ComponentFixture<MoneyLoaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MoneyLoaderComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoneyLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});