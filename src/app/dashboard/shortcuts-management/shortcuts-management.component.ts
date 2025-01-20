import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ShortcutsService } from './shortcuts.service';
import { ShortcutFormDialogComponent } from './shortcut-form-dialog/shortcut-form-dialog.component';

@Component({
  selector: 'app-shortcuts-management',
  templateUrl: './shortcuts-management.component.html',
  styleUrls: ['./shortcuts-management.component.scss']
})
export class ShortcutsManagementComponent implements OnInit {
  displayedColumns: string[] = ['Row_ID', 'Title', 'Link', 'Image', 'Status', 'Actions'];
  dataSource = new MatTableDataSource([]);

  constructor(private shortcutsService: ShortcutsService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadShortcuts();
  }

  loadShortcuts(): void {
    this.shortcutsService.getShortcuts().subscribe((data) => {
      this.dataSource.data = data['d'];
    });
  }

  openShortcutDialog(shortcut = null): void {
    const dialogRef = this.dialog.open(ShortcutFormDialogComponent, {
      width: '400px',
      data: shortcut,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.shortcutsService.addShortcut(result).subscribe((data) => {
          console.log("done");
          console.log(data['d']);
          this.loadShortcuts();
        });
      }
    });
  }

  deleteShortcut(id: string): void {
    if (confirm('Are you sure you want to delete this shortcut?')) {
      this.shortcutsService.deleteShortcut(id).subscribe(() => {
        this.loadShortcuts();
      });
    }
  }
}
