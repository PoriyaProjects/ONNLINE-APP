import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import * as $ from "jquery";
import { environment } from "src/environments/environment";

export interface Link {
    RowId: string;
    LinkId: string;
    LinkDescription: string;
    LinkStatus: string;
    Level: string;
    SubToLinkId: string;
    Children: Link[];
}

@Component({
    selector: "app-new-header",
    templateUrl: "./new-header.component.html",
    styleUrls: ["./new-header.component.css"],
})
export class NewHeaderComponent implements OnInit {
    personReadInquiry: boolean = false;
    headerLoad: boolean = true;
    constructor(private router: Router, private http: HttpClient) { }
    Links: Link[] = [];
    ngOnInit(): void {
        $(document).on("click", "[routerlink], .nav-link", function () {
            // ////debugger;
            localStorage.setItem("ReseachRowId", "0");
            $("#app-menu").removeClass("show");
            $("#menu-btn").removeClass("show");
            // //debugger
            if ($(this).attr("routerlink") == "mersham") {
                $("body").addClass("bg-blue-light");
            } else {
                $("body").removeClass("bg-blue-light");
            }
        });
        $("#menu-btn").click(function () {
            //////debugger;
            $(this).toggleClass("show");
            $("#app-menu").toggleClass("show");
        });
        this.getMenuLinks();
    }
    logout($event): void {
        //////debugger
        localStorage.clear();
        $("#app-menu").removeClass("show");
        $("#menu-btn").removeClass("show");
        this.router.navigate(["login"]);
    }
    getMenuLinks() {
        $("#loader").removeClass("d-none");
        this.headerLoad = true;
        this.http
            .post(
                //environment.url + "GetOnnLineLinks",
                environment.url + "GetOnnLineLinks2",
                {
                    user: localStorage.getItem("loginUserName"),
                }
            )
            .subscribe((Response) => {
                //debugger
                this.Links = Response["d"];
                this.headerLoad = false;
                setTimeout(function () {
                    $("#loader").addClass("d-none");
                });
            });
    }
}
