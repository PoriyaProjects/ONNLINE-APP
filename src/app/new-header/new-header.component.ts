import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import * as $ from "jquery";
import { environment } from "src/environments/environment";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

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
    searchTerm: string = '';
<<<<<<< HEAD
=======
    ipAddress: string;
>>>>>>> 1aa51f3584a09bc93f96febef7b88fe3167780f9
    filteredLinks: any[] = [];
    Links: any[] = []; // Your original links array
    constructor(private router: Router,
        private sanitizer: DomSanitizer, private http: HttpClient) { }
    ngOnInit(): void {
        this.http.post(environment.url + 'GetLocalIPAddress', {}).subscribe(
            (data) => {
                this.ipAddress = data['d'];
            },
            (error) => {
                console.error('IP fetch failed', error);
            }
        );
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
                this.filteredLinks = this.Links;
                this.headerLoad = false;
                setTimeout(function () {
                    $("#loader").addClass("d-none");
                });
            });
    }
    // Function to sanitize the HTML content
    sanitizeHtml(htmlContent: string): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(htmlContent);
    }
    filterLinks() {
        let allLinks = [];

        const flattenAndFilter = (links: any[]): any[] => {
            let matchingLinks: any[] = [];

            links.forEach(link => {
                const linkMatches = link.LinkDescription.toLowerCase().includes(this.searchTerm.toLowerCase());
                // let t = this.sanitizeHtml(link.LinkSubject);

                if (linkMatches) {
                    matchingLinks.push(link); // Add the link if it matches
                }

                if (link.Children) { // If it has children, process them recursively
                    matchingLinks = matchingLinks.concat(flattenAndFilter(link.Children));
                }
            });
            return matchingLinks;
        };


        this.filteredLinks = flattenAndFilter(this.Links);
    }
}
