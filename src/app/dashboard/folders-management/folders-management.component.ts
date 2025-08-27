import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { FolderDialogComponent } from './folder-dialog/folder-dialog.component';

export interface Folder {
  Row_ID?: number;
  Title: string;
  Link: string;
  Image: string;
  Status: boolean;
  Sort: number;
  ChromeBrowser: boolean;
  Parent?: number;
  Type: string;
}

@Component({
  selector: 'app-folders-management',
  templateUrl: './folders-management.component.html',
  styleUrls: ['./folders-management.component.css']
})
export class FoldersManagementComponent implements OnInit {

  displayedColumns: string[] = ['Title', 'Link', 'Image', 'Status', 'actions'];
  dataSource = new MatTableDataSource<Folder>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  folders: Folder[] = [];
  form: FormGroup;
  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    public dialog: MatDialog
  ) {
    this.form = this.fb.group({
      Row_ID: [],
      Title: ['', Validators.required],
      Link: [''],
      Image: [''],
      Status: [false],
      Sort: [0],
      ChromeBrowser: [false],
      Parent: [null],
      Type: ['']
    });
  }

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders() {
    this.http.post<Folder[]>(environment.url + 'GetFoldersToManagement', {}).subscribe(data => {
      this.dataSource.data = data['d'];
      // this.dataSource.paginator = this.paginator;
      // this.dataSource.sort = this.sort;
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openDialog(folder?: Folder) {
    const dialogRef = this.dialog.open(FolderDialogComponent, {
      width: '500px',
      data: folder ? { ...folder } : {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadFolders();
      }
    });
  }

  delete(id: number) {
    if (confirm('Are you sure you want to delete this folder?')) {
      this.deleteapi(id).subscribe(() => this.loadFolders());
    }
  }

  deleteapi(id: number): Observable<any> {
    return this.http.post(environment.url + 'DeleteFoldersToManagement', { id: id });
  }

}
