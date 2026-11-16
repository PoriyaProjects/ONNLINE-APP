import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Form29EditorComponent } from './form29-editor/form29-editor.component';
import { Form29Form3Component } from './form29-form3/form29-form3.component';
import { Form29ListComponent } from './form29-list/form29-list.component';

const routes: Routes = [
  { path: '', component: Form29ListComponent },
  { path: 'patient/new', component: Form29Form3Component },
  { path: 'patient/:requestId', component: Form29Form3Component },
  { path: 'new', component: Form29EditorComponent },
  { path: ':requestId', component: Form29EditorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class Form29RoutingModule {}
