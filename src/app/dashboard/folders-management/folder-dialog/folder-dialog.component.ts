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
  typeOptions: string[] = ['Folder', 'Link', 'File']; // נוספה אופציית Link מפורשת
  parents: any[] = [];
  selectedFileName: string = '';
  isUploading: boolean = false;

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
      Type: [data.Type || 'Folder'],
      FileName: [''],
      FileBase64: ['']
    });
  }

  ngOnInit() {
    this.getParentFolders();
    
    // שינוי תמונת ברירת מחדל בהתאם לסוג שנבחר
    this.form.get('Type')?.valueChanges.subscribe(val => {
      if (val === 'File' && !this.form.get('Image')?.value.includes('pdf')) {
        this.form.get('Image')?.setValue('https://blog.idrsolutions.com/app/uploads/2020/10/pdf-1.png');
      } else if (val === 'Folder') {
        this.form.get('Image')?.setValue('https://cdn-icons-png.flaticon.com/512/3767/3767084.png');
      }
    });
  }

  getParentFolders() {
    this.http.post<any[]>(environment.url + 'GetParentFolders', {})
      .subscribe(res => {
        this.parents = res['d'] || [];
      });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFileName = file.name;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        this.form.controls['FileBase64'].setValue(base64);
        this.form.controls['FileName'].setValue(file.name);
      };
      reader.readAsDataURL(file);
    }
  }

  add(folderData: any): Observable<any> {
    return this.http.post(environment.url + 'AddFoldersToManagement', { folder: folderData });
  }

  update(folderData: any): Observable<any> {
    return this.http.post(environment.url + 'UpdateFoldersToManagement', { folder: folderData });
  }

  save() {
    if (this.form.valid) {
      this.isUploading = true;
      const request = this.form.value.Row_ID ? this.update(this.form.value) : this.add(this.form.value);

      request.subscribe(
        (response) => {
          this.isUploading = false;
          if (response['d'] || response.success) {
            this.dialogRef.close(true); // סגירת המודל ורענון הטבלה
          }
        },
        (error) => {
          this.isUploading = false;
          console.error('Error saving folder:', error);
          alert('אירעה שגיאה בשמירה');
        }
      );
    }
  }
}