import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
import { DialogContentExampleDialog } from "../../../fill-survey/fill-survey.component";

interface ResuscitationFormData {
  motherInfo: {
    name: string;
    id: string;
    resuscitationDate: Date;
    resuscitationTime: string;
    location: string; // 'birthRoom', 'operatingRoom', 'other'
    pediatricianCalledTime: string;
    birthTime: string;
    resuscitationStartTime: string;
    babyGender: 'male' | 'female';
    gestationAgeWeeks: number;
    babyWeight: number;
    deliveryMethod: string;
  };
  teamMembers: { name: string; role: string }[];
  pregnancyDeliveryInfo: {
    details: string;
    meconiumStaining: boolean;
    pediatricianPresent: boolean;
    pediatricianArrivalTime: string;
  };
}
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

  labScore = this.fb.array(this.labParameters.map(() =>
    this.fb.group({
      uv: ['']
    })
  ));
  apgarScore = this.fb.array(this.apgarParameters.map(() =>
    this.fb.group({
      one: [''],
      five: [''],
      ten: [''],
      fifteen: [''],
      twenty: ['']
    })
  ));

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

  addTeamMember() {
    const teamMembers = this.resuscitationForm.get('teamMembers') as FormArray;
    teamMembers.push(
      this.fb.group({
        row: ['', null],
        name: ['', null],
        role: ['', null]
      })
    );
  }

  dateChanged(event: MatDatepickerInputEvent<Date>, form_group: any) {
    form_group.value = this._pipe.transform(event.value, 'yyyy-MM-dd');
  }

  getNewBornCprDataByID() {
    this.http
      .post(environment.url + "GetResuscitationFormData", {
        _id: this.form_id
      })
      .subscribe((Response) => {
        let data = JSON.parse(Response['d']);
        this.resuscitationForm = this.fb.group({
          motherInfo: this.fb.group({
            motherName: [data?.motherInfo.motherName, Validators.required],
            motherId: [data?.motherInfo.motherId, Validators.required],
            babyCasenumber: [data?.motherInfo.babyCasenumber, Validators.required],
            deliveryTime: [data?.motherInfo.deliveryTime, Validators.required],
            otherLocation: [data?.motherInfo.otherLocation],
            babyName: [data?.motherInfo.babyName],
            babyId: [data?.motherInfo.babyId, Validators.required],
            resuscitationDate: [data?.motherInfo.resuscitationDate],
            resuscitationTime: [data?.motherInfo.resuscitationTime],
            location: [data?.motherInfo.location],
            pediatricianCalledTime: [data?.motherInfo.pediatricianCalledTime],
            resuscitationStartTime: [data?.motherInfo.resuscitationStartTime],
            babyGender: [data?.motherInfo.babyGender, Validators.required],
            gestationAgeWeeks: [data?.motherInfo.gestationAgeWeeks],
            babyWeight: [data?.motherInfo.babyWeight],
            deliveryMethod: [data?.motherInfo.deliveryMethod, Validators.required]
          }),
          teamMembers: this.fb.array(data?.teamMembers.map(member => this.fb.group({
            row: [member.row],
            name: [member.name],
            role: [member.role]
          })) || []),
          pregnancyDeliveryInfo: this.fb.group({
            pregnancyDeliveryDetails: [data?.pregnancyDeliveryInfo.pregnancyDeliveryDetails],
            meconiumStaining: [data?.pregnancyDeliveryInfo.meconiumStaining],
            pediatricianPresent: [data?.pregnancyDeliveryInfo.pediatricianPresent],
            pediatricianArrivalTime: [data?.pregnancyDeliveryInfo.pediatricianArrivalTime]
          }),
          vitalSigns: this.fb.array(data?.vitalSigns.map(sign => this.fb.group({
            o2Sat: [sign.o2Sat],
            other: [sign.other],
            pulse: [sign.pulse],
            time: [sign.time]
          })) || []),
          resuscitationActions: this.fb.array(data?.resuscitationActions.map(action => this.fb.group({
            time: [action.time],
            suction: [action.suction],
            oxygenConcentration: [action.oxygenConcentration],
            amboOxygen: [action.amboOxygen],
            role: [action.oxygenConcentration],
            intubationVentilation: [action.intubationVentilation],
            heartMassage: [action.heartMassage],
            umbilicalVenousCatheterization: [action.umbilicalVenousCatheterization],
            extubation: [action.extubation],
            otherAction: [action.otherAction]
          })) || []),
          adrenaline: this.fb.array(data?.adrenaline.map(adr => this.fb.group({
            time: [adr.time],
            route: [adr.route],
            volume: [adr.volume]
          })) || []),
          nacl: this.fb.array(data?.nacl.map(na => this.fb.group({
            time: [na.time],
            volume: [na.volume]
          })) || []),
          nabic: this.fb.array(data?.nabic.map(nab => this.fb.group({
            time: [nab.time],
            amount: [nab.amount]
          })) || []),
          bloodProducts: this.fb.array(data?.bloodProducts.map(blood => this.fb.group({
            time: [blood.time],
            type: [blood.type],
            volume: [blood.volume]
          })) || []),
          additionalProducts: this.fb.array(data?.additionalProducts.map(add => this.fb.group({
            name: [add.name],
            time: [add.time],
            route: [add.route],
            type: [add.type],
            dosageVolume: [add.dosageVolume]
          })) || []),
          apgarScore: this.apgarScore,
          labScore: this.labScore,
          labScore2: this.labScore,
          resuscitationSummary: this.fb.group({
            summary: [data?.resuscitationSummary.summary],
            summaryTime: [data?.resuscitationSummary.summaryTime],
            conditionAtEnd: [data?.resuscitationSummary.conditionAtEnd, Validators.required],
            transferDestination: [data?.resuscitationSummary.transferDestination],
            conditionUponTransfer: [data?.resuscitationSummary.conditionUponTransfer],
            other: [data?.resuscitationSummary.other],
            oxygenSat: [data?.resuscitationSummary.oxygenSat],
            transferTime: [data?.resuscitationSummary.transferTime],
            transferredBy: [data?.resuscitationSummary.transferredBy],
            role: [data?.resuscitationSummary.role],
            infoTo: [data?.resuscitationSummary.infoTo],
            acceptanceDate: [data?.resuscitationSummary.acceptanceDate],
            acceptanceTime: [data?.resuscitationSummary.acceptanceTime],
            ByWhoEmployee: [data?.resuscitationSummary.ByWhoEmployee],
            receivedBy: [data?.resuscitationSummary.receivedBy],
            notes: [data?.resuscitationSummary.notes],
          }),
          doctorSignature: this.fb.group({
            signatureDate: [data?.doctorSignature.signatureDate],
            signatureTime: [data?.doctorSignature.signatureTime],
            nameAndRole: [data?.doctorSignature.nameAndRole],
          })
        });
        this.updateDataSources();
      });
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
    console.log(this.resuscitationForm.getRawValue());
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

}
