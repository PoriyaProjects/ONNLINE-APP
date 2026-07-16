import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-folder-dialog',
  templateUrl: './folder-dialog.component.html',
  styleUrls: ['./folder-dialog.component.css']
})
export class FolderDialogComponent implements OnInit {
  form: FormGroup;
  typeOptions: string[] = ['Folder', 'Link', 'File']; //
  parents: any[] = [];
  selectedFileName: string = '';
  isUploading: boolean = false;

  // NEW: Store the actual File object instead of a Base64 string
  selectedFile: File | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private http: HttpClient,
    private dialogRef: MatDialogRef<FolderDialogComponent>
  ) {
    this.form = this.fb.group({
      Row_ID: [data.Row_ID],
      Title: [data.Title || '', Validators.required],
      Link: [data.Link || ''],
      Image: [data.Image || 'https://cdn-icons-png.flaticon.com/512/3767/3767084.png'],
      Status: [data.Status || false],
      Sort: [data.Sort || 0],
      ChromeBrowser: [data.ChromeBrowser || false],
      Parent: [data.Parent || null],
      Type: [data.Type || 'Folder']
      // REMOVED: FileName and FileBase64 form controls are no longer needed
    });
  }

  ngOnInit() {
    this.getParentFolders();

    // Default image logic remains the same
    this.form.get('Type')?.valueChanges.subscribe(val => {
      if (val === 'File' && !this.form.get('Image')?.value.includes('pdf')) {
        this.form.get('Image')?.setValue('https://blog.idrsolutions.com/app/uploads/2020/10/pdf-1.png');
      } else if (val === 'Folder') {
        this.form.get('Image')?.setValue('https://cdn-icons-png.flaticon.com/512/3767/3767084.png');
      }
    });
  }

  getParentFolders() {
    this.http.post<any[]>(environment.urlipracticom + 'GetParentFolders', {})
      .subscribe(res => {
        this.parents = res['d'] || []; //[cite: 2]
      });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      // Keep a reference to the raw file object
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name; // Keep for the UI[cite: 2]

      // REMOVED: FileReader and Base64 generation logic.
    }
  }

  // CHANGED: Accept FormData instead of a standard object
  add(formData: FormData): Observable<any> {
    // We send formData directly. Angular's HttpClient will automatically set the Content-Type to multipart/form-data
    return this.http.post(environment.urlipracticom + 'AddFoldersToManagement', formData, { responseType: 'text' });
  }

  // CHANGED: Accept FormData instead of a standard object
  update(formData: FormData): Observable<any> {
    return this.http.post(environment.urlipracticom + 'UpdateFoldersToManagement', formData, { responseType: 'text' });
  }

  save() {
    if (this.form.valid) {
      this.isUploading = true;

      // Build the FormData payload to match the ASMX HttpContext.Current.Request.Form expectations
      const formData = new FormData();
      const formValues = this.form.value;

      // Append text fields safely
      if (formValues.Row_ID) formData.append('Row_ID', formValues.Row_ID);
      formData.append('Title', formValues.Title || '');
      formData.append('Link', formValues.Link || '');
      formData.append('Image', formValues.Image || '');

      // Convert boolean toggles to strings so the C# backend parses them easily
      formData.append('Status', formValues.Status ? 'True' : 'False');
      formData.append('Sort', formValues.Sort?.toString() || '0');
      formData.append('ChromeBrowser', formValues.ChromeBrowser ? 'True' : 'False');

      formData.append('Parent', formValues.Parent || '');
      formData.append('Type', formValues.Type || '');

      // Append the actual file if one was selected
      if (this.selectedFile) {
        formData.append('UploadedFile', this.selectedFile, this.selectedFile.name);
      }

      // Execute the request
      const request = formValues.Row_ID ? this.update(formData) : this.add(formData);

      request.subscribe(
        (response) => {
          this.isUploading = false;
          // Note: ASMX returns XML by default for non-JSON requests, but since you are using .NET AJAX extensions, it might still return JSON. We check both.
          if (response['d'] !== undefined || response) {
            this.dialogRef.close(true); // Close modal and refresh table[cite: 2]
          }
        },
        (error) => {
          this.isUploading = false;
          console.error('Error saving folder:', error); //[cite: 2]
          alert('אירעה שגיאה בשמירה'); //[cite: 2]
        }
      );
    }
  }
}