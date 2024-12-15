import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import * as $ from "jquery";
import { MenuPerm } from "../menu-perm";
import { environment } from "src/environments/environment";
import { AuthenticationService } from "./authentication.service";

@Component({
    selector: "app-login",
    templateUrl: "./login.component.html",
    styleUrls: ["./login.component.css"]
})
export class LoginComponent implements OnInit {
    constructor(
        private snackBar: MatSnackBar,
        private http: HttpClient,
        private authenticationService: AuthenticationService,
        private router: Router,
        private mMenuPerm: MenuPerm
    ) { }
    username: string;
    password: string;
    hide: boolean = true;
    user_details: any = {
        FirstName: undefined,
        LastName: undefined,
        ADUserName: undefined,
        DepartmentDescripton: undefined,
        ID: undefined,
    };
    returnUrl: string = "";
    returnParams: any = {};
    scriptOutput: string = '';

    ngOnInit() {
        if (localStorage.getItem('LastRout') == '') localStorage.setItem('LastRout', 'login');
        // Apply styles to the global <body> tag
        document.body.style.background = 'linear-gradient(to bottom right, #4a90e2, #9013fe)';
        document.body.style.height = '100vh';
        document.body.style.margin = '0';
        document.body.style.display = 'flex';
        document.body.style.justifyContent = 'center';
        document.body.style.alignItems = 'center';
        document.body.style.fontFamily = "'Arial', sans-serif";
        this.authenticationService.getAuthentication().subscribe(
            (response) => {
                console.log('Authentication Successful:', response.message);
                let user = response.message.split('\\')[1];
                console.log(user);
                this.getUserDetailsFromDBByUserName(user.toLowerCase());
            },
            (error) => {
                console.error('Authentication Failed:', error);
            }
        );
    }
    ngOnDestroy(): void {
        // Reset styles when leaving the component
        document.body.style.background = '';
        document.body.style.height = '';
        document.body.style.margin = '';
        document.body.style.display = '';
        document.body.style.justifyContent = '';
        document.body.style.alignItems = '';
        document.body.style.fontFamily = '';
    }
    hidePassword() {
        this.hide = !this.hide;
    }
    getUserDetailsFromDBByUserName(user) {
        this.http.post(environment.url + 'GetUserFullNameByUserID', {
            userID: user
        }).subscribe(
            (response: any) => {
                this.user_details = response['d'];
                console.log(this.user_details.ADUserName);
                console.log(this.user_details.DepartmentDescripton);
                if (this.user_details.ADUserName != undefined) {
                    setTimeout(() => {
                        this.mMenuPerm.setUserName(this.user_details.ADUserName);
                        localStorage.setItem("loginState", "true");
                        localStorage.setItem("Depart", this.user_details.DepartmentDescripton);
                        localStorage.setItem("FunctionDescription", this.user_details.FunctionDescription);
                        localStorage.setItem("FirstName", this.user_details.FirstName);
                        localStorage.setItem("LastName", this.user_details.LastName);
                        localStorage.setItem(
                            "loginUserName",
                            this.user_details.ADUserName
                        );
                        this.router.navigate(["dashboard"]);
                    }, 8000);
                }
            },
            (error) => {
                console.error("Error:", error);
            }
        );
    }
    login(): void {
        $("#loader").removeClass("d-none");
        if (this.username && this.password) {
            this.http
                .post(environment.url + "Login", {
                    _userName: this.username,
                    _mPassword: this.password
                })
                .subscribe(
                    response => {
                        this.snackBar.open("Login Data -- " + JSON.stringify(response["d"]), "X", {
                            duration: 2000
                        });
                        $("#loader").addClass("d-none");
                        var arrRes = (response["d"]).split(' -');

                        if (arrRes[0].replace('"', '') == "TRUE") {

                            this.mMenuPerm.setUserName(this.username);
                            localStorage.setItem("loginState", "true");
                            localStorage.setItem("Depart", arrRes[1].trim().replace('"', ''));
                            localStorage.setItem(
                                "loginUserName",
                                this.username
                            );
                            this.getUserDetailsFromDBByUserName(this.username);
                            // this.router.navigate(["dashboard"]);
                        } else {
                            localStorage.setItem("loginState", "false");
                            localStorage.setItem("loginUserName", "");
                            this.snackBar.open("Login Error! -- " + JSON.stringify(response["d"]), "X", {
                                duration: 10000
                            });
                        }
                    },
                    error => {
                        $("#loader").addClass("d-none");
                        this.snackBar.open("Login Error! -- " +
                            JSON.stringify(error), "X", {
                            duration: 10000
                        });
                    }
                );
        } else {
            $("#loader").addClass("d-none");
            this.snackBar.open("Login Error!", "X", {
                duration: 10000
            });
        }
    }
}
