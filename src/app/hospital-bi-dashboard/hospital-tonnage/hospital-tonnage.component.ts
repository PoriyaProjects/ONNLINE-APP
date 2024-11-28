import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CircleProgressComponent } from 'ng-circle-progress';
import { environment } from "src/environments/environment";
export interface DepartRefoee {
  DepartName: string;
  DepartBedsNumber: number;
  DepartBedsInUsed: number;
  DepartBedsInUsedPer: number;
  Moshamem: number;
}
@Component({
  selector: 'app-hospital-tonnage',
  templateUrl: './hospital-tonnage.component.html',
  styleUrls: ['./hospital-tonnage.component.css']
})
export class HospitalTonnageComponent implements OnInit {

  @ViewChild("circleProgress", { static: true })
  circleProgress: CircleProgressComponent;
  ngCircleOptions = {
    outerStrokeColor: "blue",
    subtitleFormat: (percent: number): string => {
      if (percent > 100) {
        $("#real-precent")
          .find("svg")
          .append($("#extra-precent").find("path"));
      }
      return "";
    },
  };
  arrDepartsRefoee: DepartRefoee[] = [];
  aobjTotal: string;
  resporatoryCount: number;
  Departmints = {
    departs: [],
    total: 0,
    resp: 0
  };

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.getDataFormServer("");
  }

  public getDataFormServer(_Depart: string) {
    $("#loader").removeClass("d-none");
    this.http
      .post(
        environment.url + "TfosaDashBoardAppRefoee",
        {
          _depart: _Depart,
        }
      )
      .subscribe(
        (Response: DepartRefoee[]) => {
          this.arrDepartsRefoee = Response["d"];
          var totalBeds = 0;
          var totalInUsed = 0;
          var totalMonshame = 0;
          for (var i = 0; i < this.arrDepartsRefoee.length; i++) {
            totalBeds += parseInt(this.arrDepartsRefoee[i].DepartBedsNumber + "");
            totalInUsed += parseInt(this.arrDepartsRefoee[i].DepartBedsInUsed + "");
            totalMonshame = parseInt(this.arrDepartsRefoee[i].Moshamem + "");
          }
          this.resporatoryCount = totalMonshame;
          this.aobjTotal = totalBeds + " / " + totalInUsed;
          this.Departmints["total"] = parseInt(
            ((
              totalInUsed / totalBeds) * 100).toFixed(
                0
              )
          );
          this.Departmints["resp"] = parseInt(
            ((totalMonshame / totalBeds) * 100).toFixed(
              0
            )
          );
          setTimeout(() => {
            $("#loader").addClass("d-none");
          });
        },
        (error) => {
          setTimeout(() => {
            $("#loader").addClass("d-none");
          });
        }
      );
  }

}
