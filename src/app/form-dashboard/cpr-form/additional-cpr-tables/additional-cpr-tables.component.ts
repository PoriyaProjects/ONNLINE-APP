import { Component } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";

@Component({
  selector: 'app-additional-cpr-tables',
  templateUrl: './additional-cpr-tables.component.html',
  styleUrls: ['./additional-cpr-tables.component.css']
})
export class AdditionalCprTablesComponent {

  constructor(
    public dialog: MatDialogRef<AdditionalCprTablesComponent>
  ) { }

  SecondSection: any;
  firstTablecolumns = Array(15).fill("שעה");
  secondTablecolumns = Array(7).fill("שעה");
  secondTableMeds = ['ADRENALINE', 'AMIODARONE', '', '', '', ''];
  statusDropDown = ['VF', 'PEA', 'ASYSTOLE', 'VT'];
  rateHeadDropdown = ['יש', 'אין'];

  submit() {
    this.dialog.close({ save: true });
  }

  closeModal() {
    this.dialog.close({ save: false });
  }

}
