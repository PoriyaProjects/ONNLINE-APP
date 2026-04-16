import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FoldersManagementComponent } from './folders-management.component';

describe('FoldersManagementComponent', () => {
  let component: FoldersManagementComponent;
  let fixture: ComponentFixture<FoldersManagementComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FoldersManagementComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FoldersManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
