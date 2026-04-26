import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfileDeptAssociationComponent } from './profile-dept-association.component';

describe('ProfileDeptAssociationComponent', () => {
  let component: ProfileDeptAssociationComponent;
  let fixture: ComponentFixture<ProfileDeptAssociationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProfileDeptAssociationComponent],
      imports: [
        HttpClientTestingModule,
        FormsModule,
        NoopAnimationsModule,
        MatSnackBarModule,
        MatButtonModule,
        MatCardModule,
        MatTableModule,
        MatCheckboxModule,
        MatInputModule,
        MatFormFieldModule,
        MatProgressSpinnerModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDeptAssociationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
