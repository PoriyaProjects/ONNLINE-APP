import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import * as $ from "jquery";
import { MenuPerm } from "../menu-perm";
import { environment } from "src/environments/environment";
import { first, map } from "rxjs/operators";
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
    user_details: any;
    returnUrl: string = "";
    returnParams: any = {};

    ngOnInit() {

        
        this.authenticationService.getAuthentication().subscribe(
            (response) => {
                debugger
                console.log('Authentication Successful:', response);
            },
            (error) => {
                debugger
                console.error('Authentication Failed:', error);
            }
        );
        // Apply styles to the global <body> tag
        // document.body.style.background = 'linear-gradient(to bottom right, #4a90e2, #9013fe)';
        // document.body.style.height = '100vh';
        // document.body.style.margin = '0';
        // document.body.style.display = 'flex';
        // document.body.style.justifyContent = 'center';
        // document.body.style.alignItems = 'center';
        // document.body.style.fontFamily = "'Arial', sans-serif";
        // this.authenticationService.login()
        //     .pipe(first())
        //     .subscribe(
        //         data => {
        //             this.router.navigate([this.returnUrl], { queryParams: this.returnParams });
        //         },
        //         error => {
        //             console.log(error);
        //         });
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
    // autoLogin() {
    //     const headers = new HttpHeaders().set('Content-Type', 'application/json');
    //     let url = "http://srv-apps-prod:47001/AutoAuthentication";
    //     // let url = "http://localhost:53287/AutoAuthentication";

    //     return this.http.get<any>(url, { headers, withCredentials: true });
    // }
    // autoLogin() {
    //     const headers = new HttpHeaders().set('Content-Type', 'application/json');
    //     let url = "http://srv-apps-prod:47001/AutoAuthentication";
    //     // let url = "http://localhost:53287/AutoAuthentication";

    //     this.http.get(url, { headers, withCredentials: true }).subscribe(
    //         (response: any) => {
    //             this.user_details = response;
    //             console.log(response);
    //         },
    //         (error) => {
    //             console.error("Error:", error);
    //         }
    //     );
    // }
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
