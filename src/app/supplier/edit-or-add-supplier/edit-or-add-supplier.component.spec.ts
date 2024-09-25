import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOrAddSupplierComponent } from './edit-or-add-supplier.component';

describe('EditOrAddSupplierComponent', () => {
  let component: EditOrAddSupplierComponent;
  let fixture: ComponentFixture<EditOrAddSupplierComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditOrAddSupplierComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditOrAddSupplierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
