import { Component, Input, OnInit } from '@angular/core';

export class Folders {
  Row_ID: string;
  Title: string;
  Link: string;
  Image: string;
  Status: string;
  Sort: string;
  ChromeBrowser: string;
  Type: string;
  isExpanded: boolean;
  Parent: string;
  Children: Folders[];
}

@Component({
  selector: 'app-folder-tree',
  templateUrl: './folder-tree.component.html',
  styleUrls: ['./folder-tree.component.css']
})
export class FolderTreeComponent implements OnInit {
  @Input() folders: Folders[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  // פונקציה אחידה ללחיצה על פריט - מחליפה את הלוגיקה הקודמת
  handleItemClick(folder: Folders, event: Event): void {
    event.stopPropagation(); // מונע אירועים כפולים בעץ רקורסיבי

    // אם זו תיקייה (יש לה ילדים או שהיא מוגדרת כתיקייה) - נרחיב/נכווץ אותה
    if (folder.Type === 'Folder' || (folder.Children && folder.Children.length > 0)) {
      folder.isExpanded = !folder.isExpanded;
      return;
    }

    // אם זה קובץ או קישור ויש לו URL - נפתח אותו
    if (folder.Link) {
      window.open(folder.Link, '_blank');
    } else {
      console.log('This folder is empty or has no action.');
    }
  }

  // פונקציית עזר להצגת אייקון ברירת מחדל לפי סוג במקרה שאין תמונה
  getIconByType(type: string): string {
    switch (type) {
      case 'File': return 'description';
      case 'Link': return 'link';
      default: return 'folder';
    }
  }
}