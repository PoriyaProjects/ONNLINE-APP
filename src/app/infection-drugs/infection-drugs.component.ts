import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { DualListComponent } from "angular-dual-listbox";
import { MenuPerm } from "../menu-perm";
import { environment } from "src/environments/environment";

export interface Drug {
  DrugId: number;
  DrugName: string;
}

@Component({
    selector: "app-infection-drugs",
    templateUrl: "./infection-drugs.component.html",
    styleUrls: ["./infection-drugs.component.css"],
})
export class InfectionDrugsComponent implements OnInit {
    source: Drug[] = [];
    confirmed: Drug[] = [];
    constructor(
        private router: Router,
        private http: HttpClient,
        private mMenuPerm: MenuPerm
    ) {
        mMenuPerm.setRoutName("InfectionDrugs");
        setTimeout(() => {
            if (!mMenuPerm.getHasPerm()) {
                localStorage.clear();
                this.router.navigate(["login"]);
            }
        }, 2000);
    }

    displayCol: string[] = ["DrugName"];
    format = {
        add: "הוסף",
        remove: "מחק",
        all: "הכל",
        none: "נקה",
        draggable: true,
    };
    ngOnInit(): void {
        this.getDataDrugFromServer("1");
        this.getDataDrugFromServer("0");
    }
    getDataDrugFromServer(DrugStatus: string) {
        this.http
            .post(
                environment.url + "GetInfectionsDrugs",
                //.post(environment.url + "getDrugsTbl",
                { DrugStatus: DrugStatus }
            )
            .subscribe((Response: Drug[]) => {
                //debugger;
                if (DrugStatus == "1") {
                    this.confirmed = Response["d"];
                    console.log(this.confirmed)
                    //debugger
                } else {
                    this.source = Response["d"];
                    //console.log(this.source)
                   // debugger
                }
            });
    }
    submitInfectionDrug() {
      console.log(this.confirmed);
      //return
      this.http
        .post(
          //environment.url + "SubmitInfectionsDrugs",
          'http://srv-apps-prod/RCF_WS/WebService.asmx/SubmitInfectionsDrugs',
          {
            DrugList: this.confirmed,
          }
        )
        .subscribe((Response) => {
        //  this.dialogRef.close("Perm Add!!")
        });
    }
}
