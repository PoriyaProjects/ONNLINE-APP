import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Folder } from '../folders-management.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-folder-dialog',
  templateUrl: './folder-dialog.component.html',
  styleUrls: ['./folder-dialog.component.css']
})
export class FolderDialogComponent implements OnInit {
  form: FormGroup;
  typeOptions: string[] = ['Folder', 'File'];
  parents: any[] = [];
  selectedFileName: string = '';
  selectedFile: File | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Folder,
    private fb: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<FolderDialogComponent>
  ) {
    this.form = this.fb.group({
      Row_ID: [data.Row_ID],
      Title: [data.Title || '', Validators.required],
      Link: [data.Link || '', data.Type == 'File' ? Validators.required : null],
      Image: [data.Image || (data.Type == 'File'
        ? 'https://blog.idrsolutions.com/app/uploads/2020/10/pdf-1.png'
        : 'https://cdn-icons-png.flaticon.com/512/3767/3767084.png')],
      Status: [data.Status || false],
      Sort: [data.Sort || 0],
      ChromeBrowser: [data.ChromeBrowser || false],
      Parent: [data.Parent || null],
      Type: [data.Type || '']
    });
  }

  ngOnInit() {
    this.getParentFolders();
  }

  getParentFolders() {
    this.http.post<Folder[]>(environment.url + 'GetParentFolders', {})
      .subscribe(data => {
        this.parents = data['d'];
      });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files[0];
    if (file) {
      this.selectedFileName = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        // Extract base64 without prefix
        const base64 = (reader.result as string).split(',')[1];

        // Store it in the form
        this.form.controls['Link'].setValue(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  // Corrected 'add' and 'update' methods
  add(formData: FormData): Observable<any> {
    // REMOVE the headers. Let the browser set the Content-Type.
    return this.http.post(environment.url + 'AddFoldersToManagement', { folder: formData });
  }

  update(formData: FormData): Observable<any> {
    // Send the FormData object directly without wrapping
    return this.http.post(environment.url + 'UpdateFoldersToManagement', { folder: formData });
  }

  // Your 'save' method remains unchanged
  save() {
    if (this.form.valid) {
      if (this.form.value.Row_ID) {
        this.update(this.form.value).subscribe(
          (response) => {
            console.log('Update response:', response);
            if (response.success) {
              // Handle success - maybe show toast message
              console.log('File saved at:', response.data.Link);
            }
          },
          (error) => {
            console.error('Update error:', error);
            // Handle error - show error message to user
          }
        );
      } else {
        this.add(this.form.value).subscribe(
          (response) => {
            console.log('Add response:', response);
            if (response.success) {
              // Handle success
              console.log('File saved at:', response.data.Link);
            }
          },
          (error) => {
            console.error('Add error:', error);
            // Handle error - show error message to user
          }
        );
      }
    }
  }
}
