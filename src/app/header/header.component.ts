import { HttpClient } from "@angular/common/http";
import { Component, ElementRef, HostListener, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import * as $ from "jquery";
import { VoiceRecognitionService } from '../header/service/voice-recognition.service'
import { environment } from "src/environments/environment";


@Component({
    selector: "app-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.css"],
    providers: [VoiceRecognitionService]
})
export class HeaderComponent implements OnInit {
    panelOpenState = false;


    constructor(private router: Router,
        public service: VoiceRecognitionService,
        private http: HttpClient) {
        this.getPermission();
        // this.service.init();
    }

    _permResearch: Boolean;
    getPermission() {
        this.http
            .post(
                environment.url + "getResearchPermission",
                {
                    _UserName: localStorage.getItem("loginUserName"),
                }
            )
            .subscribe((Response) => {
                var json = JSON.parse(Response["d"]);
                switch (json) {
                    case 1:
                    case "1":
                        this._permResearch = true;
                        break;
                    default:
                        this._permResearch = false;
                }
                setTimeout(function () {
                    // $("#loader").addClass("d-none");
                    //this.DeleteRowId = "";
                    //this.openSnackBar("נמחק בהצלחה", "success");
                }, 500);
            });
    }

    ngOnInit() {
        $(document).on("click", "[routerlink], .nav-link", function () {
            localStorage.setItem("ReseachRowId", "0");
            $("#app-menu").removeClass("show");
            $("#menu-btn").removeClass("show");
            if ($(this).attr('routerlink') == 'mersham') {
                $('body').addClass('bg-blue-light');
            } else {
                $('body').removeClass('bg-blue-light');
            }
            console.log("alert");
        });

        $("#menu-btn").click(function () {
            $(this).toggleClass("show");
            $("#app-menu").toggleClass("show");
            console.log("alert");
        });
    }

    // startService() {
    //     this.service.start()
    // }

    // stopService() {
    //     this.service.stop()
    // }
    logout($event): void {
        localStorage.clear();
        $("#app-menu").removeClass("show");
        $("#menu-btn").removeClass("show");
        this.router.navigate(["login"]);
    }
}
