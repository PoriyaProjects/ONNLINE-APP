import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { CldashboardModule } from './cldashboard/cldashboard.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BrowserModule,
    FormsModule,
    HttpClientModule,
    CldashboardModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
