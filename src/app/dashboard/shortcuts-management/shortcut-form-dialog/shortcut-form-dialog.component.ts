import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-shortcut-form-dialog',
  templateUrl: './shortcut-form-dialog.component.html',
  styleUrls: ['./shortcut-form-dialog.component.scss']
})
export class ShortcutFormDialogComponent implements OnInit {
  shortcutForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ShortcutFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.shortcutForm = this.fb.group({
      Row_ID: [this.data?.Row_ID || ''],
      Title: [this.data?.Title || ''],
      Link: [this.data?.Link || ''],
      Image: [this.data?.Image || ''],
      Sort: [this.data?.Sort || ''],
      ParentTab: [this.data?.ParentTab || ''],
      TabsPlace: [this.data?.TabsPlace || ''],
      ChromeBrowser: [this.data?.ChromeBrowser == 'False' ? false : true || false],
      Status: [this.data?.Status == 'False' ? false : true || false],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.shortcutForm.valid) {
      this.dialogRef.close(this.shortcutForm.value);
    }
  }
}
