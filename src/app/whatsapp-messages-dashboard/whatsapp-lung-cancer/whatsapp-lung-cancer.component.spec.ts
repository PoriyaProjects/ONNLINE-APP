import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappLungCancerComponent } from './whatsapp-lung-cancer.component';

describe('WhatsappLungCancerComponent', () => {
  let component: WhatsappLungCancerComponent;
  let fixture: ComponentFixture<WhatsappLungCancerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WhatsappLungCancerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WhatsappLungCancerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
