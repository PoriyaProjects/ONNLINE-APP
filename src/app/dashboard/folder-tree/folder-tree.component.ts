import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
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
  Children: Folders[]; // Add this to store child folders
}
@Component({
  selector: 'app-folder-tree',
  templateUrl: './folder-tree.component.html',
  styleUrls: ['./folder-tree.component.css']
})
export class FolderTreeComponent implements OnInit {
  @Input() folders: Folders[] = [];
  folders_display = [];

  constructor( 
          private http: HttpClient) { }

  ngOnInit(): void {
  }
  saveClickToDB(content) {
    this.http
      .post(environment.url + "SaveClickToDB", {
        name: localStorage.getItem("loginUserName").toLowerCase(),
        content: content
      })
      .subscribe((Response) => {
        try {
          console.log("Success Ask!");
        } catch (error) {
          console.log("error in sending notification!");
        }
      });
  }
  // Toggle expand/collapse state for a folder
  toggleExpand(folder: Folders): void {
    folder.isExpanded = !folder.isExpanded;
  }

  // Handle folder click
  displayFiles(folder: Folders): void {
    if (!folder) {
      // Navigate to the root folder (parent folder undefined)
      this.folders_display = this.folders; // Reset to root folder
      return;
    }

    if (folder.Children && folder.Children.length > 0) {
      // If the folder has children, display them
      this.folders_display = folder.Children;
    } else if (folder.Link) {
      // If the folder is a leaf node (no children) and has a link, navigate to the link
      if (folder.ChromeBrowser === 'true') {
        // If the folder requires Chrome to open
        const url = folder.Link;
        window.open(url, '_blank'); // Opens the link in a new browser tab
      } else {
        // Open the link in the same browser or Edge (default behavior)
        const url = folder.Link;
        window.open(url, '_blank'); // Opens the link in a new browser tab
      }
    } else {
      // No action to perform (e.g., empty folder or no link)
      console.log('This folder is empty or has no action.');
    }
  }

}
