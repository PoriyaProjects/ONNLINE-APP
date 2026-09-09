import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import * as $ from "jquery";
import { environment } from "src/environments/environment";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { menuPinKey } from "./tree-item.component";

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
    ipAddress: string;
    filteredLinks: any[] = [];
    Links: any[] = []; // Your original links array
    pinnedIds: string[] = [];
    pinnedLinks: any[] = [];
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
        let that = this;
        $(document).on("click", "[routerlink], .nav-link", function (e) {
            if ($(e.target).closest(".pin-button").length) {
                return;
            }
            if(this.href.indexOf("onnlinereorts") > 0){
                let t = this.href.split('/')[this.href.split('/').length - 1]
               // debugger
                that.http.post(
                    environment.url + "LinksLog",
                    {
                        usaerName: localStorage.getItem("loginUserName"),
                        linkId: this.href.split('/')[this.href.split('/').length - 1],
                    }
                )
                .subscribe((Response) => { });
            }
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
        const pinEntries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.indexOf("onnline.pinnedMenuLinks.") === 0) {
                pinEntries.push({ key: key, value: localStorage.getItem(key) });
            }
        }
        localStorage.clear();
        for (let i = 0; i < pinEntries.length; i++) {
            localStorage.setItem(pinEntries[i].key, pinEntries[i].value);
        }
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
                this.loadPinnedIds();
                this.refreshPinnedLinks();
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

    togglePin(link: any) {
        const key = menuPinKey(link);
        if (!key) {
            return;
        }
        const index = this.pinnedIds.indexOf(key);
        if (index >= 0) {
            this.pinnedIds = this.pinnedIds.filter(function (id) { return id !== key; });
        } else {
            this.pinnedIds = this.pinnedIds.concat([key]);
        }
        this.savePinnedIds();
        this.refreshPinnedLinks();
    }

    private pinStorageKey(): string {
        const user = (localStorage.getItem("loginUserName") || "").toLowerCase();
        return "onnline.pinnedMenuLinks." + user;
    }

    private loadPinnedIds() {
        try {
            const raw = localStorage.getItem(this.pinStorageKey());
            const parsed = raw ? JSON.parse(raw) : [];
            this.pinnedIds = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (e) {
            this.pinnedIds = [];
        }
    }

    private savePinnedIds() {
        try {
            localStorage.setItem(this.pinStorageKey(), JSON.stringify(this.pinnedIds));
        } catch (e) { }
    }

    private refreshPinnedLinks() {
        const found = [];
        for (let i = 0; i < this.pinnedIds.length; i++) {
            const link = this.findLinkByPinKey(this.Links, this.pinnedIds[i]);
            if (link) {
                found.push({
                    RowId: link.RowId,
                    LinkId: link.LinkId,
                    LinkDescription: link.LinkDescription,
                    LinkStatus: link.LinkStatus,
                    Level: link.Level,
                    SubToLinkId: link.SubToLinkId,
                    LinkSubject: link.LinkSubject,
                    LinkDoingIDFK: link.LinkDoingIDFK,
                    LinkRequestedIDFK: link.LinkRequestedIDFK,
                    Children: link.Children || []
                });
            }
        }
        this.pinnedLinks = found;
    }

    private findLinkByPinKey(links: any[], key: string): any {
        if (!links || !links.length) {
            return null;
        }
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (menuPinKey(link) === key) {
                return link;
            }
            const nested = this.findLinkByPinKey(link.Children, key);
            if (nested) {
                return nested;
            }
        }
        return null;
    }
}
