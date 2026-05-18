import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
    selector: "app-surgeries-wait-times",
    templateUrl: "./surgeries-wait-times.component.html",
    styleUrls: ["./surgeries-wait-times.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurgeriesWaitTimesComponent {}
