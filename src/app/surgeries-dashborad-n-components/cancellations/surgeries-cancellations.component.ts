import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
    selector: "app-surgeries-cancellations",
    templateUrl: "./surgeries-cancellations.component.html",
    styleUrls: ["./surgeries-cancellations.component.css"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurgeriesCancellationsComponent {}
