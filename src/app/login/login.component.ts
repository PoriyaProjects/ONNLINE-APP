import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpClient } from "@angular/common/http";
import * as $ from "jquery";
import { MenuPerm } from "../menu-perm";
import { environment } from "src/environments/environment";
@Component({
    selector: "app-login",
    templateUrl: "./login.component.html",
    styleUrls: ["./login.component.css"]
})
export class LoginComponent implements OnInit {
    constructor(
        private snackBar: MatSnackBar,
        private http: HttpClient,
        private router: Router,
        private mMenuPerm: MenuPerm
    ) { }
    username: string;
    password: string;
    hide: boolean = true;
    user_details: any;

    ngOnInit() {
        // Apply styles to the global <body> tag
        // document.body.style.background = 'linear-gradient(to bottom right, #4a90e2, #9013fe)';
        // document.body.style.height = '100vh';
        // document.body.style.margin = '0';
        // document.body.style.display = 'flex';
        // document.body.style.justifyContent = 'center';
        // document.body.style.alignItems = 'center';
        // document.body.style.fontFamily = "'Arial', sans-serif";
        this.autoLogin();
        if (
            localStorage.getItem("loginState") == "true" &&
            localStorage.getItem("loginUserName") != ""
        ) {
            this.router.navigate(["dashboard"]);
        }
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
    autoLogin() {
        this.http.get('http://srv-apps-prod:44343/Authentication', { observe: 'response', withCredentials: true })
            .subscribe({
                next: (response) => {
                    console.log(response.body);
                },
                error: (error) => {
                    console.error(error);
                }
            });
        this.http
            .post('http://srv-apps-prod/RCF_WS/WebService.asmx/' + "AutoAuthentication", { withCredentials: true })
            .subscribe((Response) => {
                try {
                    this.user_details = Response['d'];
                    console.log(this.user_details.FirstName);
                    console.log(this.user_details.LastName);
                    console.log(this.user_details.ADUserName);
                    console.log(this.user_details.DepartmentDescripton);
                    // this.mMenuPerm.setUserName(this.user_details.ADUserName.toString().toLowerCase());
                    // localStorage.setItem("loginState", "true");
                    // localStorage.setItem("Depart", this.user_details.DepartmentDescripton);
                    // localStorage.setItem(
                    //     "loginUserName",
                    //     this.user_details.ADUserName.toLowerCase()
                    // );
                    // setTimeout(() => {
                    //     this.router.navigate(['/dashboard']);
                    // }, 8000);
                } catch (error) {
                    console.log("error in AutoAuthentication list");
                }
            });
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
                            this.router.navigate(["dashboard"]);
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
