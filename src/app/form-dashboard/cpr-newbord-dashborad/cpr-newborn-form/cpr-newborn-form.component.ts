import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit, Optional, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DialogContentExampleDialog } from "../../../fill-survey/fill-survey.component";

interface VitalSignsRow {
  time: string;
  pulse: string;
  o2Sat: string;
  other: string;
}
@Component({
  selector: 'app-cpr-newborn-form',
  templateUrl: './cpr-newborn-form.component.html',
  styleUrls: ['./cpr-newborn-form.component.css']
})
export class CprNewbornFormComponent implements OnInit {

  horizontalPosition: MatSnackBarHorizontalPosition = "start";
  verticalPosition: MatSnackBarVerticalPosition = "bottom";
  resuscitationForm: FormGroup;
  saving: boolean;
  displayedColumns: string[] = ['time', 'pulse', 'o2Sat', 'other'];
  dataSource = new MatTableDataSource<VitalSignsRow>([]);
  displayedColumns2: string[] = [
    'time', 'suction', 'oxygenConcentration', 'amboOxygen',
    'intubationVentilation', 'heartMassage', 'umbilicalVenousCatheterization',
    'extubation', 'otherAction'
  ];

  apgarParameters = [
    { label: 'שמו ותפקידו של נותן הניקוד', key: 'nameRole' },
    { label: 'צבע העור', key: 'skinColor' },
    { label: 'קצב לב', key: 'heartRate' },
    { label: 'התגובה לגירוי', key: 'responseToStimuli' },
    { label: 'הטונוס', key: 'muscleTone' },
    { label: 'הנשימה', key: 'respiration' },
    { label: 'סה"כ', key: 'totalScore' },
  ];

  times = [
    { key: 'one', label: `1'` },
    { key: 'five', label: `5'` },
    { key: 'ten', label: `10'` },
    { key: 'fifteen', label: `15'` },
    { key: 'twenty', label: `20'` },
  ];
  headerColumns = ['parameter', ...this.times.map(t => t.key)];
  apgardisplayedColumns = ['parameter', ...this.times.map(t => t.key)];

  labParameters = [
    { label: 'מקור', key: 'מקור' },
    { label: 'שעה', key: 'time' },
    { label: 'PH', key: 'ph' },
    { label: 'PO2', key: 'po2' },
    { label: 'PCO2', key: 'pco2' },
    { label: 'Bic.', key: 'bic' },
    { label: 'Base Excess', key: 'baseExcess' },
    { label: 'lactate', key: 'lactate' },
  ];

  predefinedNotes: string[] = [
    'הוסבר למשפחה על מצבו של הילוד כולל פעולות שבוצעו במהלך החייאה ותוכנית להמשך טיפול'
  ];
  predefinedSummaries: string[] = [
    'החייאה בוצעה  לפי הכללים של החייאת ילוד NRP '
  ];
  predefinedPregnancyDetails: string[] = [
    'מעקב הריון (מלא ותקין / חלקי / דל) ',
    'יולדת ידועה על מחלת',
    'יולדת מקבלת טיפול תרופתי ',
    'ניתוח קיסרי (בהול / דחוף / הרדמה כללית )/ לידה מכשירנית , עקב ( מוניטור עוברי לא תקין / מים מקוניאליים / חוסר התקדמות / צניחת חבל הטבור / חום אמהי, אחר )'
  ];

  labtimes = [
    { key: 'uv', label: 'UV/אחר' }
  ];

  labHeaderColumns = ['source', ...this.labtimes.map(t => t.key)];
  labDisplayedColumns = ['source', ...this.labtimes.map(t => t.key)];

  adrenalineDisplayedColumns: string[] = ['time', 'route', 'volume'];
  adrenalineDataSource = new MatTableDataSource();

  naclDisplayedColumns: string[] = ['time', 'volume'];
  naclDataSource = new MatTableDataSource();

  nabicDisplayedColumns: string[] = ['time', 'amount'];
  nabicDataSource = new MatTableDataSource();

  bloodProductsDisplayedColumns: string[] = ['time', 'type', 'volume'];
  bloodProductsDataSource = new MatTableDataSource();

  additionalProductsDisplayedColumns: string[] = ['name', 'time', 'route', 'dosageVolume'];
  additionalProductsDataSource = new MatTableDataSource();
  @ViewChild('printSection') printSection: ElementRef;
  date_now: any = Date.now();
  filteredNameOptions: Observable<any[]>[] = [];
  teamMemberOptions = [];

  constructor(
    private fb: FormBuilder,
    @Optional() @Inject(MAT_DIALOG_DATA) public form_id: any,
    private http: HttpClient,
    private _snackBar: MatSnackBar,
    private _pipe: DatePipe,
    public dialog: MatDialog,
    @Optional() private dialogRef: MatDialogRef<CprNewbornFormComponent>,
  ) {
    this.getNewBornCprDataByID();
  }

  ngOnInit(): void {
    this.date_now = this._pipe.transform(this.date_now, 'yyyy-MM-dd');
    this.getUsersToUpdateUser();
  }

  appendPredefinedNote(note: string) {
    const current = this.resuscitationForm.get('resuscitationSummary').get('notes')?.value || '';
    const separator = current ? '\n' : '';
    this.resuscitationForm.get('resuscitationSummary').get('notes')?.setValue(current + separator + note);
  }

  appendPredefinedSummary(summary: string) {
    const current = this.resuscitationForm.get('resuscitationSummary').get('summary')?.value || '';
    const separator = current ? '\n' : '';
    this.resuscitationForm.get('resuscitationSummary').get('summary')?.setValue(current + separator + summary);
  }

  appendPregnancyDeliveryDetail(detail: string) {
    const current = this.resuscitationForm.get('pregnancyDeliveryInfo').get('pregnancyDeliveryDetails')?.value || '';
    const separator = current ? '\n' : '';
    this.resuscitationForm.get('pregnancyDeliveryInfo').get('pregnancyDeliveryDetails')?.setValue(current + separator + detail);
  }

  getFormAsHtmlString(): string {
    return this.printSection.nativeElement.innerHTML;
  }

  // Handle close button
  onClose() {
    this.dialogRef.close(); // Close the dialog
  }

  openSnackBar(message) {
    this._snackBar.open(message, "X", {
      duration: 3000,
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  createTimeControls() {
    return {
      zero: [''],
      one: [''],
      five: [''],
      ten: [''],
      fifteen: [''],
      twenty: [''],
    };
  }

  createRow(controls: string[]): FormGroup {
    const group = {};
    controls.forEach(control => {
      group[control] = [''];
    });
    return this.fb.group(group);
  }

  createRows(count: number, controls: string[], group: any): FormGroup[] {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(this.createRow(controls));
    }
    return rows;
  }

  addRow(arrayName: string) {
    const array = this.resuscitationForm.get(arrayName) as FormArray;
    array.push(this.createRow(Object.keys(array.at(0).value)));
    this.updateDataSources();
  }

  updateDataSources() {
    this.adrenalineDataSource.data = (this.resuscitationForm.get('adrenaline') as FormArray).controls;
    this.naclDataSource.data = (this.resuscitationForm.get('nacl') as FormArray).controls;
    this.nabicDataSource.data = (this.resuscitationForm.get('nabic') as FormArray).controls;
    this.bloodProductsDataSource.data = (this.resuscitationForm.get('bloodProducts') as FormArray).controls;
    this.additionalProductsDataSource.data = (this.resuscitationForm.get('additionalProducts') as FormArray).controls;
    // this.apgarScoreDataSource.data = (this.resuscitationForm.get('apgarScoreForm') as FormArray).controls;
  }

  addVitalSignsRow() {
    const vitalSigns = this.resuscitationForm.get('vitalSigns') as FormArray;
    vitalSigns.push(
      this.fb.group({
        time: [''],
        pulse: [null],
        o2Sat: [null],
        other: ['']
      })
    );
  }

  addResuscitationActionRow() {
    const resuscitationActions = this.resuscitationForm.get('resuscitationActions') as FormArray;
    resuscitationActions.push(
      this.fb.group({
        time: [''],
        suction: [''],
        oxygenConcentration: [null],
        amboOxygen: [''],
        intubationVentilation: [''],
        heartMassage: [''],
        umbilicalVenousCatheterization: [''],
        extubation: [''],
        otherAction: ['']
      })
    );
  }

  get resuscitationActionsArray(): FormArray {
    return this.resuscitationForm.get('resuscitationActions') as FormArray;
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'suction': return 'שאיבה מקנה הנשימה';
      case 'oxygenConcentration': return 'מתן חמצן חופשי בריכוז %';
      case 'amboOxygen': return 'הנשמה באמבו עם / ללא חמצן';
      case 'intubationVentilation': return 'צנרור הקנה + הנשמה';
      case 'heartMassage': return 'עיסוי לב';
      case 'umbilicalVenousCatheterization': return 'צנרור וריד הטבור UVC';
      case 'extubation': return 'הוצאת טובוס';
      case 'otherAction': return 'פעולה אחרת';
      default: return '';
    }
  }

  dateChanged(event: MatDatepickerInputEvent<Date>, form_group: any) {
    form_group.value = this._pipe.transform(event.value, 'yyyy-MM-dd');
  }

  getNewBornCprDataByID() {
    this.http
      .post(environment.url + "GetResuscitationFormData", {
        _id: this.form_id.data
      })
      .subscribe((Response) => {
        let data = JSON.parse(Response['d']);
        if (this.form_id.type == 'print') {
          const pdf = this.createPrintableString(data);
          this.dialogRef.close(pdf);
          return;
        }
        this.resuscitationForm = this.fb.group({
          motherInfo: this.fb.group({
            Id: [data?.motherInfo.Id, null],
            motherName: [data?.motherInfo.motherName, Validators.required],
            motherId: [data?.motherInfo.motherId, Validators.required],
            babyCasenumber: [data?.motherInfo.babyCasenumber, Validators.required],
            deliveryTime: [data?.motherInfo.deliveryTime, Validators.required],
            otherLocation: [data?.motherInfo.otherLocation, null],
            babyName: [data?.motherInfo.babyName, null],
            babyId: [data?.motherInfo.babyId, Validators.required],
            resuscitationDate: [data?.motherInfo.resuscitationDate == null ? this.date_now : data?.motherInfo.resuscitationDate, Validators.required],
            resuscitationTime: [data?.motherInfo.resuscitationTime, Validators.required],
            location: [data?.motherInfo.location, Validators.required],
            pediatricianCalledTime: [data?.motherInfo.pediatricianCalledTime, null],
            babyGender: [data?.motherInfo.babyGender, Validators.required],
            gestationAgeWeeks: [data?.motherInfo.gestationAgeWeeks, null],
            babyWeight: [data?.motherInfo.babyWeight, null],
            deliveryMethod: [data?.motherInfo.deliveryMethod, Validators.required]
          }),
          teamMembers: this.fb.array(data?.teamMembers.map(member => this.fb.group({
            Id: [member.Id, null],
            row: [member.row, null],
            name: [member.name, null],
            role: [member.role, null],
            otherRole: [member.otherRole, null]
          })) || []),
          pregnancyDeliveryInfo: this.fb.group({
            pregnancyDeliveryDetails: [data?.pregnancyDeliveryInfo.pregnancyDeliveryDetails, null],
            meconiumStaining: [data?.pregnancyDeliveryInfo.meconiumStaining, null],
            pediatricianPresent: [data?.pregnancyDeliveryInfo.pediatricianPresent, null],
            pediatricianArrivalTime: [data?.pregnancyDeliveryInfo.pediatricianArrivalTime, null]
          }),
          vitalSigns: this.fb.array(data?.vitalSigns.map(sign => this.fb.group({
            Id: [sign.Id, null],
            o2Sat: [sign.o2Sat, null],
            other: [sign.other, null],
            pulse: [sign.pulse, null],
            time: [sign.time, null]
          })) || []),
          resuscitationActions: this.fb.array(data?.resuscitationActions.map(action => this.fb.group({
            Id: [action.Id, null],
            time: [action.time, null],
            suction: [action.suction, null],
            oxygenConcentration: [action.oxygenConcentration, null],
            amboOxygen: [action.amboOxygen, null],
            role: [action.oxygenConcentration, null],
            intubationVentilation: [action.intubationVentilation, null],
            heartMassage: [action.heartMassage, null],
            umbilicalVenousCatheterization: [action.umbilicalVenousCatheterization, null],
            extubation: [action.extubation, null],
            otherAction: [action.otherAction, null]
          })) || []),
          adrenaline: this.fb.array(data?.adrenaline.map(adr => this.fb.group({
            Id: [adr.Id, null],
            time: [adr.time],
            route: [adr.route],
            volume: [adr.volume]
          })) || []),
          nacl: this.fb.array(data?.nacl.map(na => this.fb.group({
            Id: [na.Id, null],
            time: [na.time],
            volume: [na.volume]
          })) || []),
          nabic: this.fb.array(data?.nabic.map(nab => this.fb.group({
            Id: [nab.Id, null],
            time: [nab.time],
            amount: [nab.amount]
          })) || []),
          bloodProducts: this.fb.array(data?.bloodProducts.map(blood => this.fb.group({
            Id: [blood.Id, null],
            time: [blood.time],
            type: [blood.type],
            volume: [blood.volume]
          })) || []),
          additionalProducts: this.fb.array(data?.additionalProducts.map(add => this.fb.group({
            Id: [add.Id, null],
            name: [add.name],
            time: [add.time],
            route: [add.route],
            type: [add.type],
            dosageVolume: [add.dosageVolume]
          })) || []),
          apgarScore: this.fb.array(data?.apgarScore.map((add, index) => this.fb.group({
            Id: [add.Id, null],
            one: [index == 0 ? add.one : parseInt(add.one)],
            five: [index == 0 ? add.five : parseInt(add.five)],
            ten: [index == 0 ? add.ten : parseInt(add.ten)],
            fifteen: [index == 0 ? add.fifteen : parseInt(add.fifteen)],
            twenty: [index == 0 ? add.twenty : parseInt(add.twenty)]
          })) || []),
          labScore: this.fb.array(data?.labScore.map(add => this.fb.group({
            Id: [add.Id, null],
            uv: [add.uv],
            tableId: [add.tableId]
          })) || []),
          labScore2: this.fb.array(data?.labScore2.map(add => this.fb.group({
            Id: [add.Id, null],
            uv: [add.uv],
            tableId: [add.tableId]
          })) || []),
          resuscitationSummary: this.fb.group({
            summary: [data?.resuscitationSummary.summary, null],
            summaryTime: [data?.resuscitationSummary.summaryTime, null],
            conditionAtEnd: [data?.resuscitationSummary.conditionAtEnd, Validators.required],
            transferDestination: [data?.resuscitationSummary.transferDestination, null],
            conditionUponTransfer: [data?.resuscitationSummary.conditionUponTransfer, null],
            other: [data?.resuscitationSummary.other, null],
            oxygenSat: [data?.resuscitationSummary.oxygenSat, null],
            transferTime: [data?.resuscitationSummary.transferTime, null],
            transferredBy: [data?.resuscitationSummary.transferredBy, null],
            role: [data?.resuscitationSummary.role, null],
            infoTo: [data?.resuscitationSummary.infoTo, null],
            acceptanceDate: [data?.resuscitationSummary.acceptanceDate == null ? this.date_now : data?.resuscitationSummary.acceptanceDate, null],
            acceptanceTime: [data?.resuscitationSummary.acceptanceTime, null],
            ByWhoEmployee: [data?.resuscitationSummary.ByWhoEmployee, null],
            receivedBy: [data?.resuscitationSummary.receivedBy, null],
            notes: [data?.resuscitationSummary.notes, null],
          }),
          doctorSignature: this.fb.group({
            signatureDate: [data?.doctorSignature.signatureDate, null],
            signatureTime: [data?.doctorSignature.signatureTime, null],
            nameAndRole: [data?.doctorSignature.nameAndRole, null],
          })
        });
        this.initTeamMembersArray();
        this.updateDataSources();
      });
  }

  getUsersToUpdateUser() {
    this.http
      .post(environment.url + "GetUsersForInquiries", {
      })
      .subscribe((Response) => {
        // let allOptions = Response["d"];
        this.teamMemberOptions = Response["d"];
      });
  }

  initTeamMembersArray() {
    const teamMembers = this.resuscitationForm.get('teamMembers') as FormArray;

    teamMembers.controls.forEach((group: AbstractControl, i: number) => {
      this.filteredNameOptions[i] = group.get('name').valueChanges.pipe(
        startWith(''),
        map(value => this._filterTeamMembers(value || ''))
      );
    });
  }

  private _filterTeamMembers(value: string): any[] {
    const filterValue = value.toLowerCase();
    return this.teamMemberOptions.filter(option =>
      option.firstname.toLowerCase().includes(filterValue)
    );
  }


  calculateApgarGrades(key) {
    let tempGroup = this.resuscitationForm.controls['apgarScore'].value;
    if (key == 'one') {
      // index 0
      let sum = 0;
      for (let i = 1; i < tempGroup.length - 1; i++) {
        sum += tempGroup[i].one == '' ? 0 : parseInt(tempGroup[i].one);
      }
      this.resuscitationForm.controls['apgarScore']['controls'][6].controls.one.setValue(sum);
    } else if (key == 'five') {
      // index 1
      let sum = 0;
      for (let i = 1; i < tempGroup.length - 1; i++) {
        sum += tempGroup[i].five == '' ? 0 : parseInt(tempGroup[i].five);
      }
      this.resuscitationForm.controls['apgarScore']['controls'][6].controls.five.setValue(sum);
    } else if (key == 'ten') {
      // index 2
      let sum = 0;
      for (let i = 1; i < tempGroup.length - 1; i++) {
        sum += tempGroup[i].ten == '' ? 0 : parseInt(tempGroup[i].ten);
      }
      this.resuscitationForm.controls['apgarScore']['controls'][6].controls.ten.setValue(sum);
    } else if (key == 'fifteen') {
      // index 3
      let sum = 0;
      for (let i = 1; i < tempGroup.length - 1; i++) {
        sum += tempGroup[i].fifteen == '' ? 0 : parseInt(tempGroup[i].fifteen);
      }
      this.resuscitationForm.controls['apgarScore']['controls'][6].controls.fifteen.setValue(sum);
    } else if (key == 'twenty') {
      // index 4
      let sum = 0;
      for (let i = 1; i < tempGroup.length - 1; i++) {
        sum += tempGroup[i].twenty == '' ? 0 : parseInt(tempGroup[i].twenty);
      }
      this.resuscitationForm.controls['apgarScore']['controls'][6].controls.twenty.setValue(sum);
    }
  }

  signForm() {
    const dialogRef = this.dialog
      .open(DialogContentExampleDialog, {
        data: { sign: "" },
      })
      .afterClosed()
      .subscribe((data) => {
        //to show the sign in the template
        if (data.sign == "data:image/png;base64,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MACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECBgAPgBAgQIECAQFDAAgqWLTIAAAQIEDAA/QIAAAQIEggIGQLB0kQkQIECAgAHgBwgQIECAQFDAAAiWLjIBAgQIEDAA/AABAgQIEAgKGADB0kUmQIAAAQIGgB8gQIAAAQJBAQMgWLrIBAgQIEDAAPADBAgQIEAgKGAABEsXmQABAgQIGAB+gAABAgQIBAUMgGDpIhMgQIAAAQPADxAgQIAAgaCAARAsXWQCBAgQIGAA+AECBAgQIBAUMACCpYtMgAABAgQMAD9AgAABAgSCAgZAsHSRCRAgQICAAeAHCBAgQIBAUMAACJYuMgECBAgQMAD8AAECBAgQCAoYAMHSRSZAgAABAgaAHyBAgAABAkEBAyBYusgECBAgQMAA8AMECBAgQCAoYAAESxeZAAECBAgYAH6AAAECBAgEBQyAYOkiEyBAgAABA8APECBAgACBoIABECxdZAIECBAgYAD4AQIECBAgEBQwAIKli0yAAAECBAwAP0CAAAECBIICBkCwdJEJECBAgIAB4AcIECBAgEBQwAAIli4yAQIECBAwAPwAAQIECBAIChgAwdJFJkCAAAECBoAfIECAAAECQQEDIFi6yAQIECBAwADwAwQIECBAIChgAARLF5kAAQIECBgAfoAAAQIECAQFDIBg6SITIECAAAEDwA8QIECAAIGggAEQLF1kAgQIECDwoOYBoxwL39cAAAAASUVORK5CYII=") {
          this.resuscitationForm.controls['doctorSignature']['controls'].nameAndRole.setValue(undefined);
          return;
        }
        this.resuscitationForm.controls['doctorSignature']['controls'].nameAndRole.setValue(data.sign);
      });
  }

  onSubmit() {
    if (this.resuscitationForm.valid) {
      this.saving = true;
      // Send the data to your backend
      this.http
        .post(environment.url + "SaveNewBornCprData", {
          resus: this.resuscitationForm.getRawValue()
        })
        .subscribe((Response) => {
          if (Response['d']) {
            this.openSnackBar("נשמר בהצלחה");
            this.dialogRef.close();
          }
          else this.openSnackBar("שגיאה!");
          this.saving = false;
        });
    } else {
      this.openSnackBar("חסר שדות חובה!");
    }
  }

  getPersonDetails() {
    let _passport = this.resuscitationForm.controls['motherInfo'].value.motherId;
    if (_passport != null && _passport != '') {
      this.http
        .post(
          environment.url + "GetMotherInfoByPassportID",
          {
            _passport: _passport.replace('-', '').trim()
          }
        )
        .subscribe((Response) => {
          let patient = Response['d'];
          this.resuscitationForm.controls['motherInfo']['controls'].motherName.setValue(patient.motherName);
          this.resuscitationForm.controls['motherInfo']['controls'].babyGender.setValue(patient.babyGender);
          this.resuscitationForm.controls['motherInfo']['controls'].gestationAgeWeeks.setValue(patient.gestationAgeWeeks);
          this.resuscitationForm.controls['motherInfo']['controls'].babyWeight.setValue(patient.babyWeight);
          this.resuscitationForm.controls['motherInfo']['controls'].deliveryMethod.setValue(patient.deliveryMethod);
          this.resuscitationForm.controls['motherInfo']['controls'].babyId.setValue(patient.babyId);
          this.resuscitationForm.controls['motherInfo']['controls'].babyCasenumber.setValue(patient.babyCasenumber);
          this.resuscitationForm.controls['motherInfo']['controls'].babyName.setValue(patient.babyName);
          this.resuscitationForm.controls['motherInfo']['controls'].deliveryTime.setValue(patient.deliveryTime);
        });
    }
  }

  createPrintableString(data) {
    const motherInfo = data.motherInfo;
    const teamMembers = data.teamMembers;
    const pregnancyDeliveryInfo = data.pregnancyDeliveryInfo;
    const vitalSignsArray = data.vitalSigns;
    const resuscitationActions = data.resuscitationActions;
    const adrenaline = data.adrenaline;
    const nacl = data.nacl;
    const nabic = data.nabic;
    const apgarScore = data.apgarScore;
    const labScore = data.labScore;
    const labScore2 = data.labScore2;
    const bloodProducts = data.bloodProducts;
    const additionalProducts = data.additionalProducts;
    const resuscitationSummary = data.resuscitationSummary;
    const doctorSignature = data.doctorSignature;

    const rows = teamMembers.map((member: any, index: number) => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ccc;">${index + 1}</td>
      <td style="padding: 8px; border: 1px solid #ccc;">${member.name || ''}</td>
      <td style="padding: 8px; border: 1px solid #ccc;">${member.role || ''}</td>
      <td style="padding: 8px; border: 1px solid #ccc;">${member.otherRole || ''}</td>
    </tr>
  `).join('');
    const rowsHtml = vitalSignsArray.map((row: any) => `
    <tr>
      <td>${row.time || ''}</td>
      <td>${row.pulse || ''}</td>
      <td>${row.o2Sat || ''}</td>
      <td>${row.other || ''}</td>
    </tr>
  `).join('');
    const rowsHtml2 = resuscitationActions.map((row: any) => `
    <tr>
      <td>${row.time || ''}</td>
      <td>${row.suction || ''}</td>
      <td>${row.oxygenConcentration || ''}</td>
      <td>${row.amboOxygen || ''}</td>
      <td>${row.intubationVentilation || ''}</td>
      <td>${row.heartMassage || ''}</td>
      <td>${row.umbilicalVenousCatheterization || ''}</td>
      <td>${row.extubation || ''}</td>
      <td>${row.otherAction || ''}</td>
    </tr>
  `).join('');
    const adrenalineRows = adrenaline.map((row: any) => {
      const time = row.time;
      const route = row.route;
      const volume = row.volume;
      return `
      <tr>
        <td>${time}</td>
        <td>${route}</td>
        <td>${volume}</td>
      </tr>
    `;
    }).join('');
    const naclRows = nacl.map((row: any) => {
      const time = row.time;
      const volume = row.volume;
      return `
        <tr>
          <td>${time}</td>
          <td>${volume}</td>
        </tr>
      `;
    }).join('');
    const nabicRows = nabic.map((row: any) => {
      const time = row.time;
      const amount = row.amount;
      return `
        <tr>
          <td>${time}</td>
          <td>${amount}</td>
        </tr>
      `;
    }).join('');
    const rowsHtml3 = bloodProducts.map((row: any) => {
      const time = row.time;
      const type = row.type;
      const volume = row.volume;
      return `
      <tr>
        <td>${time}</td>
        <td>${type}</td>
        <td>${volume}</td>
      </tr>
    `;
    }).join('');
    const rowsHtml4 = additionalProducts.map((row: any) => {
      const name = row.name;
      const time = row.time;
      const route = row.route;
      const dosageVolume = row.dosageVolume;
      return `
      <tr>
        <td>${name}</td>
        <td>${time}</td>
        <td>${route}</td>
        <td>${dosageVolume}</td>
      </tr>
    `;
    }).join('');
    const rowsHtml5 = apgarScore.map((param: any, i: number) => {
      const parameter = this.apgarParameters[i].label || '';
      const timeColumnsHtml = this.times.map((time: any) => {
        const score = param[time.key] || '';
        return `<td>${score}</td>`;
      }).join('');

      return `
      <tr>
        <td>${parameter}</td>
        ${timeColumnsHtml}
      </tr>
    `;
    }).join('');

    const headerColumnsHtml5 = apgarScore.map((time: any) => {
      return `<th>${time.label}</th>`;
    }).join('');

    const rowsHtml6 = labScore.map((param: any, i: number) => {
      const source = this.labParameters[i].label || '';
      const timeColumnsHtml6 = this.labtimes.map((time: any) => {
        const value = param[time.key] || '';
        return `<td>${value}</td>`;
      }).join('');

      return `
      <tr>
        <td>${source}</td>
        ${timeColumnsHtml6}
      </tr>
    `;
    }).join('');

    const headerColumnsHtml6 = labScore.map((time: any) => {
      return `<th>${time.label}</th>`;
    }).join('');

    const rowsHtml7 = labScore2.map((param: any, i: number) => {
      const source = this.labParameters[i].label || '';
      const timeColumnsHtml7 = this.labtimes.map((time: any) => {
        const value = param[time.key] || '';
        return `<td>${value}</td>`;
      }).join('');

      return `
      <tr>
        <td>${source}</td>
        ${timeColumnsHtml7}
      </tr>
    `;
    }).join('');

    const headerColumnsHtml7 = labScore2.map((time: any) => {
      return `<th>${time.label}</th>`;
    }).join('');

    return `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h2 style="text-align: center;">פרטי הילוד</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td><strong>תעודת זהות היולדת:</strong> ${motherInfo.motherId || ''}</td>
          <td><strong>שם היולדת:</strong> ${motherInfo.motherName || ''}</td>
        </tr>
        <tr>
          <td><strong>תעודת זהות הילוד:</strong> ${motherInfo.babyId || ''}</td>
          <td><strong>מספר מקרה הילוד:</strong> ${motherInfo.babyCasenumber || ''}</td>
        </tr>
        <tr>
          <td><strong>החייאה בוצעה בתאריך:</strong> ${motherInfo.resuscitationDate || ''}</td>
          <td><strong>בשעה:</strong> ${motherInfo.resuscitationTime || ''}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>מיקום ההחייאה:</strong> ${motherInfo.location || ''}</td>
        </tr>
        ${motherInfo.location === 'מקום אחר' ? `
          <tr>
            <td colspan="2"><strong>אחר:</strong> ${motherInfo.otherLocation || ''}</td>
          </tr>
        ` : ''}

        <tr>
          <td><strong>שעת הלידה:</strong> ${motherInfo.deliveryTime || ''}</td>
          <td><strong>שעת קריאת רופא ילודים:</strong> ${motherInfo.pediatricianCalledTime || ''}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>מין הילוד:</strong> ${motherInfo.babyGender || ''}</td>
        </tr>
        <tr>
          <td><strong>גיל הריון בשבועות:</strong> ${motherInfo.gestationAgeWeeks || ''}</td>
          <td><strong>משקל הילוד:</strong> ${motherInfo.babyWeight || ''} ק"ג</td>
        </tr>
        <tr>
          <td colspan="2"><strong>צורת הלידה:</strong> ${motherInfo.deliveryMethod || ''}</td>
        </tr>
      </table>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h2 style="text-align: center;">אנשי צוות</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ccc;">#</th>
            <th style="padding: 8px; border: 1px solid #ccc;">שם</th>
            <th style="padding: 8px; border: 1px solid #ccc;">תפקיד</th>
            <th style="padding: 8px; border: 1px solid #ccc;">אחר</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="3" style="padding: 8px; text-align: center;">לא הוזנו אנשי צוות</td></tr>'}
        </tbody>
      </table>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h2 style="text-align: center;">מהלך ההריון והלידה</h2>

      <div style="margin-bottom: 16px;">
        <strong>מידע על מהלך ההריון והלידה:</strong>
        <div style="padding: 8px; border: 1px solid #ccc; min-height: 80px;">
          ${pregnancyDeliveryInfo.pregnancyDeliveryDetails || '<em>לא הוזן</em>'}
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <strong>מים מקוניאליים:</strong>
        <span>${pregnancyDeliveryInfo.meconiumStaining === '1' ? 'כן' : pregnancyDeliveryInfo.meconiumStaining === '0' ? 'לא' : 'לא נבחר'}</span>
      </div>

      <div style="margin-bottom: 16px;">
        <strong>רופא ילודים נכח בלידה:</strong>
        <span>${pregnancyDeliveryInfo.pediatricianPresent === '1' ? 'כן' : pregnancyDeliveryInfo.pediatricianPresent === '0' ? 'לא' : 'לא נבחר'}</span>
      </div>

      ${pregnancyDeliveryInfo.pediatricianPresent === '1'
        ? `<div style="margin-bottom: 16px;">
              <strong>שעת הגעת רופא ילודים:</strong>
              <span>${pregnancyDeliveryInfo.pediatricianArrivalTime || 'לא הוזנה שעה'}</span>
            </div>`
        : ''
      }
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h2 style="text-align: center;">מעקב מדדים</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
        <thead style="background-color: #f0f0f0;">
          <tr>
            <th>שעה</th>
            <th>דופק</th>
            <th>O2Sat</th>
            <th>אחר</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="4"><em>אין נתונים</em></td></tr>'}
        </tbody>
      </table>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h2 style="text-align: center;">הפעולות שבוצעו במהלך ההחייאה</h2>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>שעה</th>
              <th>שאיבה מקנה הנשימה</th>
              <th>מתן חמצן חופשי %</th>
              <th>הנשמה באמבו עם/ללא</th>
              <th>צנרור הקנה + הנשמה</th>
              <th>עיסוי לב</th>
              <th>צנרור וריד הטבור</th>
              <th>הוצאת טובוס</th>
              <th>פעולה אחרת</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml2 || '<tr><td colspan="9"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h2 style="text-align: center;">תרופות ותכשירים שניתנו במהלך ההחייאה</h2>
      <h3 style="text-align: right; margin-top: 24px;">אדרנלין בריכוז 1:10,000</h3>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>שעת המתן</th>
              <th>דרך המתן</th>
              <th>נפח התמיסה שניתן (סמ"ק)</th>
            </tr>
          </thead>
          <tbody>
            ${adrenalineRows || '<tr><td colspan="3"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h3 style="text-align: right; margin-top: 24px;">IV NaCl 0.9%</h3>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>שעת המתן</th>
              <th>נפח התמיסה שניתן (סמ"ק)</th>
            </tr>
          </thead>
          <tbody>
            ${naclRows || '<tr><td colspan="2"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h3 style="text-align: right; margin-top: 24px;">מוצרי דם</h3>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>שעת המתן</th>
              <th>סוג המוצר</th>
              <th>הנפח שניתן (סמ"ק)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml3 || '<tr><td colspan="3"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h3 style="text-align: right; margin-top: 24px;">מוצרים נוספים</h3>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>שם התכשיר</th>
              <th>שעת המתן</th>
              <th>דרך המתן</th>
              <th>מינון / נפח</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml4 || '<tr><td colspan="4"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h3 style="text-align: right; margin-top: 24px;">פרמטרים של אפגר</h3>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>תאור</th>
              <th>1'</th>
              <th>5'</th>
              <th>10'</th>
              <th>15'</th>
              <th>20'</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml5 || '<tr><td colspan="' + (this.times.length + 1) + '"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h3 style="text-align: right; margin-top: 24px;">פרמטרים של מעבדה</h3>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>מקור הדגימה</th>
              <th>UV/אחר</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml6 || '<tr><td colspan="' + (this.labtimes.length + 1) + '"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h3 style="text-align: right; margin-top: 24px;">פרמטרים של מעבדה (גרסה 2)</h3>
      <div style="overflow-x: auto;">
        <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>מקור הדגימה</th>
              <th>UV/אחר</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml7 || '<tr><td colspan="' + (this.labtimes.length + 1) + '"><em>אין נתונים</em></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  ` +
      `
    <div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
      <h3 style="text-align: right;">סיכום החייאה</h3>

      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td><strong>סיכום:</strong>${resuscitationSummary.summary || ''}</td>
          <td><strong>שעת סיום ההחייאה:</strong>${resuscitationSummary.summaryTime || ''}</td>
        </tr>
        
        <tr>
          <td><strong>מצב הילוד בתום החייאה:</strong>${resuscitationSummary.conditionAtEnd || ''}</td>
          <td><strong>בתום ההחייאה הילוד הועבר:</strong>${resuscitationSummary.transferDestination || ''}</td>
        </tr>
        
        <tr>
          <td><strong>מצב הילוד בהעברה:</strong>${resuscitationSummary.conditionUponTransfer || ''}</td>
          <td *ngIf="formValue.conditionUponTransfer === 'אחר'"><strong>אחר:</strong>${resuscitationSummary.other || ''}</td>
        </tr>
        
        <tr>
          <td><strong>סטורציה בהעברה %:</strong>${resuscitationSummary.oxygenSat || ''}</td>
          <td><strong>שעת העברה:</strong>${resuscitationSummary.transferTime || ''}</td>
        </tr>
        
        <tr>
          <td><strong>התינוק הועבר ע"י:</strong>${resuscitationSummary.transferredBy || ''}</td>
          <td><strong>תפקיד:</strong>${resuscitationSummary.role || ''}</td>
        </tr>
        
        <tr>
          <td><strong>מידע נמסר ל:</strong>${resuscitationSummary.infoTo || ''}</td>
          <td><strong>תאריך:</strong>${resuscitationSummary.acceptanceDate || ''}</td>
        </tr>
        
        <tr>
          <td><strong>שעה:</strong>${resuscitationSummary.acceptanceTime || ''}</td>
          <td><strong>ע"י (שם ותפקיד):</strong>${resuscitationSummary.ByWhoEmployee || ''}</td>
        </tr>
        
        <tr>
          <td><strong>בנוכחות:</strong>${resuscitationSummary.receivedBy || ''}</td>
          <td><strong>תוכן המידע שנמסר:</strong>${resuscitationSummary.notes || ''}</td>
        </tr>
        
      </table>
        
      <div style="margin-top: 16px;">
        <h3 style="text-align: right;">חתימה וחותמת הרופא האחראי על החייאה:</h3>

        <div style="display: flex; flex-wrap: wrap; margin-bottom: 16px;">
          <!-- Signature Date -->
          <div style="width: 50%; margin-bottom: 16px;">
            <strong>תאריך:</strong>
            <span>${doctorSignature.signatureDate || ''}</span>
          </div>

          <!-- Signature Time -->
          <div style="width: 50%; margin-bottom: 16px;">
            <strong>שעה:</strong>
            <span>${doctorSignature.signatureTime || ''}</span>
          </div>

          <!-- Signature -->
          <div style="width: 50%; margin-bottom: 16px;">
            <strong>חתימה:</strong>
            <img src="${doctorSignature.nameAndRole}" />
          </div>
        </div>
      </div>
    </div>
  `;
  }

}
