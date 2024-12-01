import { Component, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-feed-line',
  templateUrl: './feed-line.component.html',
  styleUrls: ['./feed-line.component.css']
})
export class FeedLineComponent implements OnInit {

  feedItems: Array<any> = [];
  user_name = localStorage.getItem("loginUserName").toLowerCase();
  urlRegex = /https?:\/\/[^\s]+/g;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Initialize the feed items
    this.getFeedLineContent();
  }


  transformText(text: string) {
    return text.replace(this.urlRegex, (url) => `<a href="${url}" target="_blank">לחץ כאן</a>`);
  }


  getFeedLineContent() {
    this.http
      .post(environment.url + "GetFeedLineContent", {})
      .subscribe((Response) => {
        try {
          this.feedItems = Response['d'];
        } catch (error) {
          console.log("error in feedItems list");
        }
      });
  }

  updateFeedLineContent(event, id) {
    this.http
      .post(environment.url + "UpdateFeedLineContent", {
        content: event,
        id: id,
        userName: this.user_name
      })
      .subscribe((Response) => {
        try {
          if (Response['d']) console.log("saved!");
        } catch (error) {
          alert("error in feedItems update");
        }
        this.getFeedLineContent();
      });
  }
}
