import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
export interface DepartRefoee {
    DepartName: string;
    DepartBedsNumber: number;
    DepartBedsInUsed: number;
    DepartBedsInUsedPer: number;
    Moshamem: number;
}
@Component({
    selector: "app-dashboard",
    templateUrl: "./dashboard.component.html",
    styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
    folders_display = [];
    shortcuts = [];
    folders = [];
    first_name: string;
    last_name: string;
    full_date: string;
    employee_id: string;
    ProfilePicture: string;
    birth_day_people = [];
    userName = localStorage.getItem("loginUserName").toLowerCase();
    birthdayUser: boolean = false;
    constructor(private router: Router, private http: HttpClient) { }
    today: number = Date.now();
    _dotsLoader =
        '<div class="spinner">' +
        '<div class="bounce1"></div>' +
        '<div class="bounce2"></div>' +
        '<div class="bounce3"></div>' +
        "</div>";
    ngOnInit() {
        $("#Vector_13").append('text').text('This is some information about whatever')
            .attr('x', 50)
            .attr('y', 150)
            .attr('fill', '#938F8F');

        this.getLoginUserDetails();
        this.getBirthDayPeople();
        this.getShortCutsLinks();
        this.getFoldersLinks();
    }
    openFileInTab(link: string) {
        if (link == '') return;
        window.open(link, "_blank");
    }
    userClickedProfilePicture(person) {
        console.log(person);
        this.http
            .post(environment.url + "userClickedProfilePicture", {
                user_name: this.userName,
                first_name: person.FirstName,
                last_name: person.LastName
            });
    }
    getBirthDayPeople() {
        this.http
            .post(environment.url + "GetBirthDayPeople", {
                user_name: this.userName
            })
            .subscribe((Response) => {
                try {
                    this.birth_day_people = Response['d'];
                } catch (error) {
                    console.log("error in birthday list");
                }
            });
    }
    getShortCutsLinks() {
        this.http
            .post(environment.url + "GetShortCutsLinks", {
                _userName: this.userName
            })
            .subscribe((Response) => {
                try {
                    this.shortcuts = Response['d'];
                } catch (error) {
                    console.log("error in birthday list");
                }
            });
    }
    getFoldersLinks() {
        this.http
            .post(environment.url + "GetFoldersLinks", {
                _userName: this.userName
            })
            .subscribe((Response) => {
                try {
                    this.folders = Response['d'];
                    this.folders_display = this.folders.filter(x => x.Parent == "0");
                } catch (error) {
                    console.log("error in birthday list");
                }
            });
    }
    openWithEdge2(link: string) {
        window.open("microsoft-edge:" + link);
    }
    getLoginUserDetails() {
        this.http
            .post(environment.url + "GetLoginUserDetails", {
                _userName: this.userName
            })
            .subscribe((Response) => {
                let user = Response["d"];
                try {
                    this.employee_id = user.EmployeeID;
                    this.ProfilePicture = user.ProfilePicture;
                    this.first_name = user.FirstName;
                    this.last_name = user.LastName;
                    this.full_date = user.FullBirthDate;
                    let currentDate = new Date();
                    let day = user.DateOfBirth.split("-")[1];
                    let month = user.DateOfBirth.split("-")[0];
                    if (parseInt(day) == currentDate.getDate() && parseInt(month) == (currentDate.getMonth() + 1)) {
                        this.birthdayUser = true;
                    }
                } catch (error) {
                    console.log("error in birthday");
                }

            });
    }
    getEmployeeImage(employee_id) {
        const img = `http://srv-apps-prod/Images/${employee_id}.jpg`;
        return img;
    }
    openFolder() {
        let link = "\\\\srv-apps-02\\bin2\\פרוטוקולים לטיפול אנטיביוטי אמפירי";
        window.location.href = link;
        // window.open("", "_blank");
    }
}
