import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { environment } from 'src/environments/environment';
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
    { label: 'שעה', key: 'time' },
    { label: 'תוצאה', key: 'result' },
    { label: 'PH', key: 'ph' },
    { label: 'PO2', key: 'po2' },
    { label: 'PCO2', key: 'pco2' },
    { label: 'Bic.', key: 'bic' },
    { label: 'Base Excess', key: 'baseExcess' },
    { label: 'O2 Sat', key: 'o2Sat' },
    { label: 'אחר', key: 'other1' },
    { label: 'אחר', key: 'other2' },
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
    @Optional() private dialogRef: MatDialogRef<CprNewbornFormComponent>,
  ) {
    this.getNewBornCprDataByID();

  }

  ngOnInit(): void {
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
      })
      .subscribe((Response) => {
        let data = JSON.parse(Response['d']);
        this.resuscitationForm = this.fb.group({
          motherInfo: this.fb.group({
            babyName: [data?.motherInfo.babyName],
            babyId: [data?.motherInfo.babyId],
            resuscitationDate: [data?.motherInfo.resuscitationDate],
            resuscitationTime: [data?.motherInfo.resuscitationTime],
            location: [data?.motherInfo.location],
            pediatricianCalledTime: [data?.motherInfo.pediatricianCalledTime],
            resuscitationStartTime: [data?.motherInfo.resuscitationStartTime],
            babyGender: [data?.motherInfo.babyGender],
            gestationAgeWeeks: [data?.motherInfo.gestationAgeWeeks],
            babyWeight: [data?.motherInfo.babyWeight],
            deliveryMethod: [data?.motherInfo.deliveryMethod]
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
            conditionAtEnd: [data?.resuscitationSummary.conditionAtEnd],
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
        // for (let i = 0; i <= 3; i++) {
        //   this.addTeamMember();
        // }
        // for (let i = 0; i <= 6; i++) {
        //   this.addVitalSignsRow();
        // }
        // for (let i = 0; i <= 6; i++) {
        //   this.addResuscitationActionRow();
        // }
        // const array1 = this.resuscitationForm.get('adrenaline') as FormArray;
        // const array2 = this.resuscitationForm.get('nacl') as FormArray;
        // const array3 = this.resuscitationForm.get('nabic') as FormArray;
        // const array4 = this.resuscitationForm.get('bloodProducts') as FormArray;
        // const array5 = this.resuscitationForm.get('additionalProducts') as FormArray;
        // for (let i = 0; i < 6; i++) {
        //   array1.push(this.createRow(['time', 'route', 'volume']));
        //   array2.push(this.createRow(['time', 'volume']));
        //   array3.push(this.createRow(['time', 'amount']));
        //   array4.push(this.createRow(['time', 'type', 'volume']));
        //   array5.push(this.createRow(['name', 'time', 'route', 'dosageVolume']));
        // }
        this.updateDataSources();
      });
  }

  onSubmit() {
    if (this.resuscitationForm.valid) {
      console.log(this.resuscitationForm.getRawValue());
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
        });
    }
  }

}
