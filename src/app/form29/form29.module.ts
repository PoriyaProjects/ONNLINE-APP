import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Form29EditorComponent } from './form29-editor/form29-editor.component';
import { Form29Form3Component } from './form29-form3/form29-form3.component';
import { Form29ListComponent } from './form29-list/form29-list.component';
import { Form29RoutingModule } from './form29-routing.module';

@NgModule({
  declarations: [Form29ListComponent, Form29EditorComponent, Form29Form3Component],
  imports: [CommonModule, FormsModule, Form29RoutingModule, MatSnackBarModule],
})
export class Form29Module {}
