import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
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

  constructor(private fb: FormBuilder) {
    this.resuscitationForm = this.fb.group({
      motherInfo: this.fb.group({
        babyName: [''],
        babyId: [''],
        resuscitationDate: [null],
        resuscitationTime: [''],
        location: ['birthRoom'], // Default value
        pediatricianCalledTime: [''],
        resuscitationStartTime: [''],
        babyGender: ['male'], // Default value
        gestationAgeWeeks: [null],
        babyWeight: [null],
        deliveryMethod: ['']
      }),
      teamMembers: this.fb.array([]), // Use FormArray for dynamic table rows
      pregnancyDeliveryInfo: this.fb.group({
        pregnancyDeliveryDetails: [''],
        meconiumStaining: ['false'], // Default value
        pediatricianPresent: ['false'], // Default value
        pediatricianArrivalTime: ['']
      }),
      vitalSigns: this.fb.array([]),
      resuscitationActions: this.fb.array([]),
      adrenaline: this.fb.array([]),
      nacl: this.fb.array([]),
      nabic: this.fb.array([]),
      bloodProducts: this.fb.array([]),
      additionalProducts: this.fb.array([]),
      apgarScore: this.apgarScore,
      labScore: this.labScore,
      labScore2: this.labScore,
      resuscitationSummary: this.fb.group({
        summary: [''],
        summaryTime: [''],
        conditionAtEnd: [''],
        transferDestination: [''],
        conditionUponTransfer: [''],
        other: [''],
        oxygenSat: [''],
        transferTime: [''],
        transferredBy: [''],
        role: [''],
        infoTo: [''],
        acceptanceDate: [''],
        acceptanceTime: [''],
        ByWhoEmployee: [''],
        receivedBy: [''],
        notes: [''],
      }),
      doctorSignature: this.fb.group({
        signatureDate: [''],
        signatureTime: [''],
        nameAndRole: [''],
      })
    });
    for (let i = 0; i <= 3; i++) {
      this.addTeamMember();
    }
    for (let i = 0; i <= 6; i++) {
      this.addVitalSignsRow();
    }
    for (let i = 0; i <= 6; i++) {
      this.addResuscitationActionRow();
    }
    const array1 = this.resuscitationForm.get('adrenaline') as FormArray;
    const array2 = this.resuscitationForm.get('nacl') as FormArray;
    const array3 = this.resuscitationForm.get('nabic') as FormArray;
    const array4 = this.resuscitationForm.get('bloodProducts') as FormArray;
    const array5 = this.resuscitationForm.get('additionalProducts') as FormArray;
    for (let i = 0; i < 6; i++) {
      array1.push(this.createRow(['time', 'route', 'volume']));
      array2.push(this.createRow(['time', 'volume']));
      array3.push(this.createRow(['time', 'amount']));
      array4.push(this.createRow(['time', 'type', 'volume']));
      array5.push(this.createRow(['name', 'time', 'route', 'dosageVolume']));
    }
    this.updateDataSources();
  }

  ngOnInit(): void {
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
        action: [''],
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

  onSubmit() {
    if (this.resuscitationForm.valid) {
      console.log(this.resuscitationForm.getRawValue());
      // Send the data to your backend
    }
  }

}
