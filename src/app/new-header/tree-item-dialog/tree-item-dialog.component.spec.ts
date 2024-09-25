import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeItemDialogComponent } from './tree-item-dialog.component';

describe('TreeItemDialogComponent', () => {
  let component: TreeItemDialogComponent;
  let fixture: ComponentFixture<TreeItemDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TreeItemDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TreeItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
