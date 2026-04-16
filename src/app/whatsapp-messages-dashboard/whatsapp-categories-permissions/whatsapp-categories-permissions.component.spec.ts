import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappCategoriesPermissionsComponent } from './whatsapp-categories-permissions.component';

describe('WhatsappCategoriesPermissionsComponent', () => {
  let component: WhatsappCategoriesPermissionsComponent;
  let fixture: ComponentFixture<WhatsappCategoriesPermissionsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WhatsappCategoriesPermissionsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WhatsappCategoriesPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
