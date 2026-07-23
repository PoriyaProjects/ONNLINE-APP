import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
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

  // שינוי סדר העמודות והוספת עמודת ה-Type, הורדתי את התמונה מהטבלה הראשית (נשלב אותה בכותרת)
  displayedColumns: string[] = ['Type', 'Title', 'Link', 'Status', 'Sort', 'actions'];
  dataSource = new MatTableDataSource<Folder>([]);
  user_name: string = localStorage.getItem('loginUserName') || '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private http: HttpClient,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadFolders();
  }

  loadFolders() {
    this.http.post<{ d: Folder[] }>(environment.url + 'GetFoldersToManagement', { user_name: this.user_name }).subscribe(data => {
      this.dataSource.data = data.d;
      // שימוש ב-setTimeout מוודא שה-View סיים להתרנדר לפני שיוך ה-Paginator
      setTimeout(() => {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      });
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openDialog(folder?: Folder) {
    const dialogRef = this.dialog.open(FolderDialogComponent, {
      width: '650px',
      maxWidth: '95vw',
      data: folder ? { ...folder } : {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadFolders();
      }
    });
  }

  delete(id: number) {
    if (confirm('האם אתה בטוח שברצונך למחוק פריט זה? הפעולה בלתי הפיכה.')) {
      this.deleteapi(id).subscribe(() => this.loadFolders());
    }
  }

  deleteapi(id: number): Observable<any> {
    return this.http.post(environment.url + 'DeleteFoldersToManagement', { id: id });
  }

  // פונקציית עזר להחזרת אייקון תואם לסוג הפריט
  getTypeIcon(type: string): string {
    switch (type) {
      case 'Folder': return 'snippet_folder';
      case 'File': return 'description';
      case 'Link': return 'link';
      default: return 'folder';
    }
  }
}