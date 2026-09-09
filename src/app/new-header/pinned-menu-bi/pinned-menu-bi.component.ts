import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { environment } from "src/environments/environment";
import { DEFAULT_PIN_LIMIT } from "../tree-item.component";

@Component({
    selector: "app-pinned-menu-bi",
    templateUrl: "./pinned-menu-bi.component.html",
    styleUrls: ["./pinned-menu-bi.component.css"]
})
export class PinnedMenuBiComponent implements OnInit {
    loading = false;
    featureClicks = 0;
    uniqueUsers = 0;
    currentPinRows = 0;
    topPinnedUrls: any[] = [];
    topPinnedThenRemoved: any[] = [];
    quotaUserName = "";
    quotaMaxPins = DEFAULT_PIN_LIMIT;
    defaultLimit = DEFAULT_PIN_LIMIT;

    constructor(private http: HttpClient, private snackBar: MatSnackBar) { }

    ngOnInit(): void {
        this.reload();
    }

    reload() {
        this.loading = true;
        this.http.post(environment.url + "GetPinnedMenuBi", {}).subscribe(
            (Response) => {
                const data = Response && Response["d"] ? Response["d"] : Response;
                this.featureClicks = Number(data.FeatureClicks || data.featureClicks || 0);
                this.uniqueUsers = Number(data.UniqueUsers || data.uniqueUsers || 0);
                this.currentPinRows = Number(data.CurrentPinRows || data.currentPinRows || 0);
                this.topPinnedUrls = this.unwrapRows(data.TopPinnedUrls || data.topPinnedUrls);
                this.topPinnedThenRemoved = this.unwrapRows(data.TopPinnedThenRemoved || data.topPinnedThenRemoved);
                this.loading = false;
            },
            () => {
                this.loading = false;
            }
        );
    }

    saveQuota() {
        const userName = (this.quotaUserName || "").trim();
        const maxPins = Number(this.quotaMaxPins);
        if (!userName || maxPins < 1 || maxPins > 100) {
            this.snackBar.open("יש להזין שם משתמש ומכסה בין 1 ל-100", "", {
                duration: 2500, direction: "rtl", horizontalPosition: "center", verticalPosition: "top"
            });
            return;
        }
        this.http.post(environment.url + "SetPinnedMenuUserQuota", {
            userName: userName,
            maxPins: maxPins,
            updatedBy: (localStorage.getItem("loginUserName") || "").toLowerCase()
        }).subscribe(
            (Response) => {
                const ok = Response && Response["d"];
                this.snackBar.open(ok ? "המכסה עודכנה" : "עדכון המכסה נכשל", "", {
                    duration: 2500, direction: "rtl", horizontalPosition: "center", verticalPosition: "top"
                });
            },
            () => {
                this.snackBar.open("עדכון המכסה נכשל", "", {
                    duration: 2500, direction: "rtl", horizontalPosition: "center", verticalPosition: "top"
                });
            }
        );
    }

    private unwrapRows(rows: any): any[] {
        if (!rows) {
            return [];
        }
        const list = Array.isArray(rows) ? rows : [];
        return list.map(function (row) {
            return {
                url: row.Url || row.url || "",
                title: row.Title || row.title || "",
                cnt: Number(row.Cnt || row.cnt || 0)
            };
        });
    }
}
