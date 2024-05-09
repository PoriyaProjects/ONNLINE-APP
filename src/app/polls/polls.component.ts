import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { MenuPerm } from '../menu-perm';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { environment } from 'src/environments/environment';

export interface Polls {
  ID: number;
  PollName: string;
  PollDescription: string;
}
@Component({
  selector: 'app-polls',
  templateUrl: './polls.component.html',
  styleUrls: ['./polls.component.css']
})
export class PollsComponent implements OnInit {
  resultsLength: number = 0;
  TABLE_DATA: Polls[] = [];
  displayedColumns: string[] = [
    "ID", //"D_SHEET_ID",
    "PollName",
    "PollDescription",
    "Edit",
    "Receipts",
  ];
  dataSource = new MatTableDataSource(this.TABLE_DATA);

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;

  fliterVal = "";
  constructor(private _snackBar: MatSnackBar,
    private router: Router,
    private http: HttpClient,
    private formBuilder: FormBuilder
    ,
    private mMenuPerm: MenuPerm) {
    mMenuPerm.setRoutName("polls");
    setTimeout(() => {
      if (!mMenuPerm.getHasPerm()) {
        localStorage.clear();
        this.router.navigate(["login"]);
      }
    }, 2000);
  }
  ngOnInit(): void {

  }
  getPaginatorData(event: PageEvent) {
    //console.log(this.paginator.pageIndex);

    this.getTableFromServer(
      this.paginator.pageIndex,
      this.paginator.pageSize,
      this.fliterVal
    );
  }
  public getTableFromServer(
    _pageIndex: number,
    _pageSize: number,
    _FreeText: string
  ) {
    let tableLoader = false;
    if ($("#loader").hasClass("d-none")) {
      // ////debugger
      tableLoader = true;
      $("#loader").removeClass("d-none");
    }
    this.http
      .post(
        environment.url + "GetPolls",
        {
          _pageIndex: _pageIndex,
          _pageSize: _pageSize,
          _FreeText: _FreeText,
        }
      )
      .subscribe((Response: Polls) => {
        this.TABLE_DATA.splice(0, this.TABLE_DATA.length);
        var json = Response["d"];
        let DepartsData = json;
        //////debugger

        this.TABLE_DATA = json


        // ////debugger
        this.dataSource = new MatTableDataSource<any>(this.TABLE_DATA);
        if (json.length > 0) {
          this.resultsLength = parseInt(json[0]["TotalRecords"]);
        } else {
          this.resultsLength = 0;
        }

        setTimeout(function () {
          //////debugger
          if (tableLoader) {
            $("#loader").addClass("d-none");
          }
        });
      });
  }
}

