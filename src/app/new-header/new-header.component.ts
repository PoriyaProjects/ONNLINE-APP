import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";
import * as $ from "jquery";
import { environment } from "src/environments/environment";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { menuPinKey, DEFAULT_PIN_LIMIT } from "./tree-item.component";

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
    maxPins: number = DEFAULT_PIN_LIMIT;
    constructor(private router: Router,
        private sanitizer: DomSanitizer, private http: HttpClient,
        private snackBar: MatSnackBar) { }
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
                this.loadPinnedIdsFromServer();
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
        this.logPinAction("click", link, key);
        const index = this.pinnedIds.indexOf(key);
        if (index >= 0) {
            this.pinnedIds = this.pinnedIds.filter(function (id) { return id !== key; });
        } else if (this.pinnedIds.length >= this.maxPins) {
            this.snackBar.open(
                "ניתן לנעוץ עד " + this.maxPins + " קישורים. לפתיחת מכסה נוספת פנו למנהל.",
                "",
                { duration: 3500, direction: "rtl", horizontalPosition: "center", verticalPosition: "top" }
            );
            return;
        } else {
            this.pinnedIds = this.pinnedIds.concat([key]);
        }
        this.refreshPinnedLinks();
        this.savePinnedIdsToServer();
    }

    private currentUserName(): string {
        return (localStorage.getItem("loginUserName") || "").toLowerCase();
    }

    private unwrapPinnedIds(payload: any): string[] {
        let data = payload;
        if (data && data.d !== undefined) {
            data = data.d;
        }
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return [];
            }
        }
        if (!Array.isArray(data)) {
            return [];
        }
        const ids = [];
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const key = item && typeof item === "object"
                ? String(item.PinKey || item.RowId || item.LinkId || "")
                : String(item || "");
            if (key && ids.indexOf(key) === -1) {
                ids.push(key);
            }
        }
        return ids;
    }

    private loadPinnedIdsFromServer() {
        const userName = this.currentUserName();
        if (!userName) {
            this.pinnedIds = [];
            this.refreshPinnedLinks();
            return;
        }
        this.http
            .post(environment.url + "GetPinnedMenuQuota", { userName: userName })
            .subscribe(
                (Response) => {
                    const quota = Number(Response && Response["d"]);
                    this.maxPins = quota > 0 ? quota : DEFAULT_PIN_LIMIT;
                },
                () => {
                    this.maxPins = DEFAULT_PIN_LIMIT;
                }
            );
        this.http
            .post(environment.url + "GetPinnedMenuLinks", { userName: userName })
            .subscribe(
                (Response) => {
                    this.pinnedIds = this.unwrapPinnedIds(Response);
                    this.refreshPinnedLinks();
                },
                () => {
                    this.pinnedIds = [];
                    this.refreshPinnedLinks();
                }
            );
    }

    private savePinnedIdsToServer() {
        const userName = this.currentUserName();
        if (!userName) {
            return;
        }
        this.http
            .post(environment.url + "SavePinnedMenuLinks", {
                userName: userName,
                pinnedIdsJson: this.buildPinnedPayload()
            })
            .subscribe(() => { }, () => { });
    }

    private logPinAction(action: string, link: any, key: string) {
        const userName = this.currentUserName();
        if (!userName) {
            return;
        }
        this.http
            .post(environment.url + "LogPinnedMenuAction", {
                userName: userName,
                action: action,
                pinKey: key,
                linkId: link && link.LinkId ? String(link.LinkId) : "",
                linkDescription: link && link.LinkDescription ? String(link.LinkDescription) : ""
            })
            .subscribe(() => { }, () => { });
    }

    private buildPinnedPayload(): string {
        const items = [];
        for (let i = 0; i < this.pinnedIds.length; i++) {
            const key = this.pinnedIds[i];
            const link = this.findLinkByPinKey(this.Links, key);
            items.push({
                pinKey: key,
                linkId: link && link.LinkId ? String(link.LinkId) : "",
                linkDescription: link && link.LinkDescription ? String(link.LinkDescription) : ""
            });
        }
        return JSON.stringify(items);
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
