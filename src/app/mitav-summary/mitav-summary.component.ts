import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import * as XLSX from 'xlsx';

/* =========================================================
   BACKEND RESPONSE TYPES
   ========================================================= */

interface MitavSummaryResponse {
  Summary?: {
    All_Patients?: number;
    Patients_Not_In_Excluded_Units?: number;
    Patients_In_Target_Units?: number;
    Patients_In_Target_Units_With_Steps?: number;
  };

  Units?: Array<{
    Unit_Group?: string;
    Unit_Name?: string;
    Patients_In_Target_Units?: number;
    Patients_In_Target_Units_With_Steps?: number;
  }>;

  AgeGender?: Array<{
    Age_Group?: string;
    C2_Male?: number;
    C2_Female?: number;
    C3_Male?: number;
    C3_Female?: number;
    C4_Male?: number;
    C4_Female?: number;
  }>;

  AgeDays?: Array<{
    Age_Group?: string;

    C2_0_3_Days?: number;
    C2_4_5_Days?: number;
    C2_6Plus_Days?: number;

    C3_0_3_Days?: number;
    C3_4_5_Days?: number;
    C3_6Plus_Days?: number;

    C4_0_3_Days?: number;
    C4_4_5_Days?: number;
    C4_6Plus_Days?: number;
  }>;

  AdmissionMobility?: Array<{
    Mobility_Group?: string;
    All_Patients?: number;
    Category_2?: number;
    Category_3?: number;
    Category_4?: number;
  }>;

  DischargeMobility?: Array<{
    Mobility_Group?: string;
    All_Patients?: number;
    Category_2?: number;
    Category_3?: number;
    Category_4?: number;
  }>;

  MobilityChange?: Array<{
    Mobility_Change?: string;
    Category_2?: number;
    Category_3?: number;
    Category_4?: number;
  }>;

  AdmissionMobilityDetailed?: Array<{
    Mobility_Group?: string;
    All_Patients?: number;
    Category_2?: number;
    Category_3?: number;
    Category_4?: number;
  }>;
}


/* =========================================================
   FILTER TYPES
   ========================================================= */

interface FilterOption {
  label: string;
  value: number | string | null;
}


/* =========================================================
   CONSTANTS
   ========================================================= */

const QUARTER_LABELS: { [quarter: number]: string } = {
  1: 'רבעון 1 (ינואר-מרץ)',
  2: 'רבעון 2 (אפריל-יוני)',
  3: 'רבעון 3 (יולי-ספטמבר)',
  4: 'רבעון 4 (אוקטובר-דצמבר)'
};


/* =========================================================
   COMPONENT
   ========================================================= */

@Component({
  selector: 'app-mitav-summary',
  templateUrl: './mitav-summary.component.html',
  styleUrls: ['./mitav-summary.component.css']
})
export class MitavSummaryComponent implements OnInit {

  /* =======================================================
     STATE
     ======================================================= */

  isLoading = true;

  /* =======================================================
     TABLE DATA
     ======================================================= */

  tableData: any[] = [];
  departmentTableData: any[] = [];
  ageGenderTableData: any[] = [];
  hospitalizationTableData: any[] = [];

  mobilityAdmissionTableData: any[] = [];
  mobilityDischargeTableData: any[] = [];
  mobilityStatusTableData: any[] = [];
  mobilityChangeTableData: any[] = [];
  mobilityBasicFunctionTableData: any[] = [];


  /* =======================================================
     FILTERS
     ======================================================= */

  availableYears: FilterOption[] = [];
  availableQuarters: FilterOption[] = [];

  selectedYear: number | null = null;
  selectedQuarter: number | null = null;

  dateFrom: Date | null = null;
  dateTo: Date | null = null;


  /* =======================================================
     LAST API RESPONSE
     ======================================================= */

  private backendData: MitavSummaryResponse | null = null;


  /* =======================================================
     STATIC TABLE 3
     ======================================================= */

  generalQuestionsData = [
    {
      question:
        'א. מהו כלי הערכה המשמש להערכת ניידות בקבלה ובשחרור מטופלים?',
      answer:
        'אומדן נורטון בקבלה , הערכת ניידות בשחרור'
    },
    {
      question:
        'ב. מיהם בעלי התפקידים שביצעו את הולכת המטופלים? (בחירה מתוך רשימה נפתחת)',
      answer: 'מתנדב'
    },
    {
      question: '',
      answer: 'בן משפחה'
    },
    {
      question: '',
      answer: 'סטודנט'
    },
    {
      question: '',
      answer: 'כח עזר'
    },
    {
      question: '',
      answer: 'אחות'
    },
    {
      question: '',
      answer: 'רופא'
    },
    {
      question: '',
      answer: 'פיזיותרפיסט'
    },
    {
      question: '',
      answer: 'אחר ... לפרט בהערות'
    },
    {
      question: '',
      answer: 'מטופל עצמאי'
    }
  ];


  /* =======================================================
     CONSTRUCTOR
     ======================================================= */

  constructor(private http: HttpClient) {}


  /* =======================================================
     INIT
     ======================================================= */

  ngOnInit(): void {

    this.initializeFilters();

    /*
     * Initial load.
     * No date range is required for the first request.
     */
     this.isLoading = false;
  }


  /* =======================================================
     FILTER INITIALIZATION
     ======================================================= */

  private initializeFilters(): void {

    const currentYear = new Date().getFullYear();

    /*
     * We keep a useful year list because the aggregated backend
     * response does not contain patient-level dates.
     */
    this.availableYears = [
      {
        value: null,
        label: 'ללא'
      },
      {
        value: -1,
        label: 'הכל'
      }
    ];

    /*
     * Add the current year and previous years.
     * This can later be replaced with a Years array from backend.
     */
    for (let year = currentYear; year >= currentYear - 6; year--) {
      this.availableYears.push({
        value: year,
        label: year.toString()
      });
    }


    this.availableQuarters = [
      {
        value: null,
        label: 'ללא'
      },
      {
        value: -1,
        label: 'הכל'
      },
      {
        value: 1,
        label: QUARTER_LABELS[1]
      },
      {
        value: 2,
        label: QUARTER_LABELS[2]
      },
      {
        value: 3,
        label: QUARTER_LABELS[3]
      },
      {
        value: 4,
        label: QUARTER_LABELS[4]
      }
    ];


    /*
     * Default selections.
     */
    this.selectedYear = -1;
    this.selectedQuarter = -1;
  }


  /* =======================================================
     YEAR CHANGE
     ======================================================= */

  onYearChange(): void {

    /*
     * Do not call the API here.
     *
     * The user chooses the year/quarter/date range and then
     * presses the Search button.
     */
    if (this.selectedYear === null) {
      this.selectedQuarter = null;
      return;
    }

    if (
      this.selectedQuarter === null ||
      this.selectedQuarter === undefined
    ) {
      this.selectedQuarter = -1;
    }
  }

canSearch(): boolean {
  const hasDateRange =
    !!this.dateFrom && !!this.dateTo;

  const hasYearQuarter =
    this.selectedYear !== null &&
    this.selectedYear !== -1 &&
    this.selectedQuarter !== null &&
    this.selectedQuarter !== -1;

  return hasDateRange || hasYearQuarter;
}
  /* =======================================================
     SEARCH
     ======================================================= */
search(): void {

  let dateIn: string | null = null;
  let dateOut: string | null = null;


  // =========================================
  // OPTION 1: User selected a date range
  // =========================================

  if (this.dateFrom && this.dateTo) {

    if (this.dateFrom > this.dateTo) {
      console.warn(
        'MitavSummary: DateIn cannot be later than DateOut.'
      );

      return;
    }

    dateIn = this.formatDateForApi(this.dateFrom);
    dateOut = this.formatDateForApi(this.dateTo);
  }


  // =========================================
  // OPTION 2: User selected Year + Quarter
  // =========================================

  else if (
    this.selectedYear !== null &&
    this.selectedYear !== -1 &&
    this.selectedQuarter !== null &&
    this.selectedQuarter !== -1
  ) {

    const year = this.selectedYear;
    const quarter = this.selectedQuarter;

    const startMonth =
      (quarter - 1) * 3;

    const startDate =
      new Date(
        year,
        startMonth,
        1
      );

    const endDate =
      new Date(
        year,
        startMonth + 3,
        0
      );

    dateIn =
      this.formatDateForApi(startDate);

    dateOut =
      this.formatDateForApi(endDate);
  }


  // =========================================
  // Nothing selected
  // =========================================

  else {
    console.warn(
      'MitavSummary: please select a date range or Year + Quarter.'
    );

    return;
  }


  const requestBody = {
    DateIn: dateIn,
    DateOut: dateOut
  };


  console.log(
    'MitavSummary request:',
    requestBody
  );


  this.isLoading = true;


  this.http
    .post(
      environment.url + 'FetchMitavSummary',
      requestBody
    )
    .subscribe(
      (response: any) => {

        console.log(
          'MitavSummary response:',
          response
        );

        const parsed =
          this.parseBackendResponse(response);


        if (!parsed) {

          console.error(
            'MitavSummary: invalid backend response.'
          );

          this.clearTables();
          this.isLoading = false;

          return;
        }


        this.backendData = parsed;

        this.mapBackendToTables(parsed);

        this.isLoading = false;
      },


      (error) => {

        console.error(
          'MitavSummary API error:',
          error
        );

        this.clearTables();

        this.isLoading = false;
      }
    );
}
  /* =======================================================
     API DATE FORMAT
     ======================================================= */

  private formatDateForApi(
    date: Date | null
  ): string | null {

    if (!date) {
      return null;
    }


    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');


    return `${year}-${month}-${day}`;
  }


  /* =======================================================
     PARSE BACKEND RESPONSE
     ======================================================= */

  private parseBackendResponse(
    response: any
  ): MitavSummaryResponse | null {

    let payload =
      response &&
      response.d !== undefined
        ? response.d
        : response;


    /*
     * ASMX may return JSON inside response.d as a string.
     */
    if (typeof payload === 'string') {

      try {

        payload = JSON.parse(payload);

      } catch (error) {

        console.error(
          'MitavSummary: unable to parse response.d',
          error
        );

        return null;
      }
    }


    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {

      console.error(
        'MitavSummary: expected aggregated object response.'
      );

      return null;
    }


    return payload as MitavSummaryResponse;
  }


  /* =======================================================
     MAP BACKEND DATA
     ======================================================= */

  private mapBackendToTables(
    data: MitavSummaryResponse
  ): void {

    this.mapTable1(data);

    this.mapTable2(data);

    /*
     * Table 3 remains static.
     */

    this.mapTable4(data);

    this.mapTable5(data);

    this.mapTable6(data);

    this.mapTable7(data);

    this.mapTable8(data);

    this.mapTable9(data);
  }


  /* =======================================================
     TABLE 1
     ======================================================= */

  private mapTable1(
    data: MitavSummaryResponse
  ): void {

    const summary = data.Summary || {};


    this.tableData = [
      {
        totalPatients:
          this.toNumber(summary.All_Patients),

        internalAndSurgicalPatients:
          this.toNumber(
            summary.Patients_Not_In_Excluded_Units
          ),

        walkingProgramPatients:
          this.toNumber(
            summary.Patients_In_Target_Units
          ),

        walkingProgramAchieved70:
          this.toNumber(
            summary.Patients_In_Target_Units_With_Steps
          )
      }
    ];
  }


  /* =======================================================
     TABLE 2
     ======================================================= */

  private mapTable2(
    data: MitavSummaryResponse
  ): void {

    const units =
      data.Units || [];


    this.departmentTableData =
      units.map(unit => {

        return {
          departmentType:
            unit.Unit_Group || '',

          departmentName:
            unit.Unit_Name || '',

          totalPatients:
            this.toNumber(
              unit.Patients_In_Target_Units
            ),

          walkingParticipants:
            this.toNumber(
              unit.Patients_In_Target_Units_With_Steps
            )
        };

      });
  }


  /* =======================================================
     TABLE 4
     ======================================================= */

  private mapTable4(
    data: MitavSummaryResponse
  ): void {

    const source =
      data.AgeGender || [];


    this.ageGenderTableData =
      source.map(row => {

        return {
          ageGroup:
            row.Age_Group || '',

          totalMale:
            this.toNumber(row.C2_Male),

          totalFemale:
            this.toNumber(row.C2_Female),

          walkingMale:
            this.toNumber(row.C3_Male),

          walkingFemale:
            this.toNumber(row.C3_Female),

          achieved70Male:
            this.toNumber(row.C4_Male),

          achieved70Female:
            this.toNumber(row.C4_Female)
        };

      });
  }


  /* =======================================================
     TABLE 5
     ======================================================= */

  private mapTable5(
    data: MitavSummaryResponse
  ): void {

    const source =
      data.AgeDays || [];


    this.hospitalizationTableData =
      source.map(row => {

        return {
          ageGroup:
            row.Age_Group || '',


          internal3Days:
            this.toNumber(
              row.C2_0_3_Days
            ),

          internal4to5Days:
            this.toNumber(
              row.C2_4_5_Days
            ),

          internal6PlusDays:
            this.toNumber(
              row.C2_6Plus_Days
            ),


          walking3Days:
            this.toNumber(
              row.C3_0_3_Days
            ),

          walking4to5Days:
            this.toNumber(
              row.C3_4_5_Days
            ),

          walking6PlusDays:
            this.toNumber(
              row.C3_6Plus_Days
            ),


          achieved3Days:
            this.toNumber(
              row.C4_0_3_Days
            ),

          achieved4to5Days:
            this.toNumber(
              row.C4_4_5_Days
            ),

          achieved6PlusDays:
            this.toNumber(
              row.C4_6Plus_Days
            )
        };

      });
  }


  /* =======================================================
     TABLE 6
     ======================================================= */

  private mapTable6(
  data: MitavSummaryResponse
): void {

  const source =
    data.AdmissionMobility || [];

  this.mobilityAdmissionTableData =
    source.map(row => {

      return {
        parameter:
          row.Mobility_Group || '',

        // IMPORTANT:
        // Do NOT use All_Patients here.
        internalAndSurgical:
          this.toNumber(
            row.Category_2
          ),

        walkingProgram:
          this.toNumber(
            row.Category_3
          ),

        walkingProgramAchieved70:
          this.toNumber(
            row.Category_4
          )
      };

    });
}

  /* =======================================================
     TABLE 7
     ======================================================= */

  private mapTable7(
  data: MitavSummaryResponse
): void {

  const source =
    data.DischargeMobility || [];

  this.mobilityDischargeTableData =
    source.map(row => {

      return {
        parameter:
          row.Mobility_Group || '',

        // IMPORTANT:
        // Do NOT use All_Patients here.
        internalAndSurgical:
          this.toNumber(
            row.Category_2
          ),

        walkingProgram:
          this.toNumber(
            row.Category_3
          ),

        walkingProgramAchieved70:
          this.toNumber(
            row.Category_4
          )
      };

    });
}
  /* =======================================================
     TABLE 8
     ======================================================= */

  private mapTable8(
    data: MitavSummaryResponse
  ): void {

    const source =
      data.MobilityChange || [];


    this.mobilityChangeTableData =
      source.map(row => {

        return {
          parameter:
            row.Mobility_Change || '',

          internalAndSurgical:
            this.toNumber(
              row.Category_2
            ),

          walkingProgram:
            this.toNumber(
              row.Category_3
            ),

          walkingProgramAchieved70:
            this.toNumber(
              row.Category_4
            )
        };

      });
  }


  /* =======================================================
     TABLE 9
     ======================================================= */

  private mapTable9(
  data: MitavSummaryResponse
): void {

  const source =
    data.AdmissionMobilityDetailed || [];

  this.mobilityBasicFunctionTableData =
    source.map(row => {

      return {
        parameter:
          row.Mobility_Group || '',

        // IMPORTANT:
        // Do NOT use All_Patients here.
        internalAndSurgical:
          this.toNumber(
            row.Category_2
          ),

        walkingProgram:
          this.toNumber(
            row.Category_3
          ),

        walkingProgramAchieved70:
          this.toNumber(
            row.Category_4
          )
      };

    });
}

  /* =======================================================
     CLEAR TABLES
     ======================================================= */

  private clearTables(): void {

    this.tableData = [];
    this.departmentTableData = [];
    this.ageGenderTableData = [];
    this.hospitalizationTableData = [];

    this.mobilityAdmissionTableData = [];
    this.mobilityDischargeTableData = [];
    this.mobilityStatusTableData = [];
    this.mobilityChangeTableData = [];
    this.mobilityBasicFunctionTableData = [];
  }


  /* =======================================================
     TOTAL ROW
     ======================================================= */

  isTotalRow(row: any): boolean {

    return !!row &&
      (
        row.ageGroup === 'סה"כ' ||
        row.parameter === 'סה"כ'
      );
  }


  /* =======================================================
     NUMBER HELPER
     ======================================================= */

  private toNumber(value: any): number {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0;
    }


    const numberValue =
      Number(
        String(value)
          .replace(/,/g, '')
          .replace('%', '')
          .trim()
      );


    return isNaN(numberValue)
      ? 0
      : numberValue;
  }


  /* =======================================================
     BACKWARD COMPATIBILITY
     ======================================================= */

  applyFilter(): void {

    /*
     * The filtering is now performed by the backend.
     *
     * Keeping this method allows the existing HTML/template
     * bindings to remain valid.
     */
    this.search();
  }


  /* =======================================================
     EXCEL EXPORT
     ======================================================= */

  exportAllTables(): void {

    const wb:
      XLSX.WorkBook =
      XLSX.utils.book_new();


    const ws:
      XLSX.WorkSheet =
      XLSX.utils.aoa_to_sheet([]);


    let rowOffset = 0;


    const addSection = (
      title: string,
      headers: string[],
      data: any[],
      columns: string[]
    ) => {

      XLSX.utils.sheet_add_aoa(
        ws,
        [[title]],
        {
          origin: {
            r: rowOffset,
            c: 0
          }
        }
      );


      rowOffset += 1;


      XLSX.utils.sheet_add_aoa(
        ws,
        [headers],
        {
          origin: {
            r: rowOffset,
            c: 0
          }
        }
      );


      rowOffset += 1;


      const rows =
        data.map(row =>
          columns.map(
            column => row[column]
          )
        );


      XLSX.utils.sheet_add_aoa(
        ws,
        rows,
        {
          origin: {
            r: rowOffset,
            c: 0
          }
        }
      );


      rowOffset +=
        rows.length + 2;
    };


    /* -----------------------------------------
       TABLE 1
       ----------------------------------------- */

    addSection(
      '1. אוכלוסיות בגיליון',

      [
        'מאושפזים בגיל 65+ שהתאשפזו בכל מחלקות בית החולים',
        'מאושפזים 65+ בכלל המחלקות באגף הפנימי והכירורגי',
        'מאושפזים בגיל 65+ בכלל המחלקות המשתתפות בתכנית הליכה',
        'מאושפזים בגיל 65+ שהשתתפו בתכנית הליכה - מטופלים שעמדו ביעד של 70%'
      ],

      this.tableData,

      [
        'totalPatients',
        'internalAndSurgicalPatients',
        'walkingProgramPatients',
        'walkingProgramAchieved70'
      ]
    );


    /* -----------------------------------------
       TABLE 2
       ----------------------------------------- */

    addSection(
      '2. משתתפים בתכנית הליכה לפי מחלקה (יעד 1)',

      [
        'סוג המחלקה',
        'שם המחלקה',
        'מספר מאושפזים בני 65+ במחלקה',
        'מאושפזים בגיל 65+ שהשתתפו בתכנית הליכה'
      ],

      this.departmentTableData,

      [
        'departmentType',
        'departmentName',
        'totalPatients',
        'walkingParticipants'
      ]
    );


    /* -----------------------------------------
       TABLE 3
       ----------------------------------------- */

    addSection(
      '3. תכנית הליכה - שאלות כלליות',

      [
        '',
        ''
      ],

      this.generalQuestionsData,

      [
        'question',
        'answer'
      ]
    );


    /* -----------------------------------------
       TABLE 4
       ----------------------------------------- */

    addSection(
      '4. מספר מאושפזים לפי קבוצת גיל ומין',

      [
        'קבוצת גיל',
        'זכרים סה"כ',
        'נקבות סה"כ',
        'זכרים הליכה',
        'נקבות הליכה',
        'זכרים 70%+',
        'נקבות 70%+'
      ],

      this.ageGenderTableData,

      [
        'ageGroup',
        'totalMale',
        'totalFemale',
        'walkingMale',
        'walkingFemale',
        'achieved70Male',
        'achieved70Female'
      ]
    );


    /* -----------------------------------------
       TABLE 5
       ----------------------------------------- */

    addSection(
      '5. מספר מאושפזים לפי קבוצת גיל ומשך האשפוז',

      [
        'קבוצת גיל',
        'פנימיות 0-3 ימים',
        'פנימיות 4-5 ימים',
        'פנימיות 6+ ימים',
        'הליכה 0-3 ימים',
        'הליכה 4-5 ימים',
        'הליכה 6+ ימים',
        '70%+ 0-3 ימים',
        '70%+ 4-5 ימים',
        '70%+ 6+ ימים'
      ],

      this.hospitalizationTableData,

      [
        'ageGroup',
        'internal3Days',
        'internal4to5Days',
        'internal6PlusDays',
        'walking3Days',
        'walking4to5Days',
        'walking6PlusDays',
        'achieved3Days',
        'achieved4to5Days',
        'achieved6PlusDays'
      ]
    );


    /* -----------------------------------------
       TABLE 6
       ----------------------------------------- */

    addSection(
      '6. פרמטר ניידות בקבלה',

      [
        'פרמטר ניידות / אוכלוסיית מאושפזים',
        'סה"כ מאושפזים בגיל 65+ במחלקות פנימיות וכירורגיות',
        'מאושפזים בגיל 65+ בכלל המחלקות המשתתפות בתכנית הליכה',
        'סה"כ המאושפזים בגיל 65+ שהשתתפו בתכנית הליכה'
      ],

      this.mobilityAdmissionTableData,

      [
        'parameter',
        'internalAndSurgical',
        'walkingProgram',
        'walkingProgramAchieved70'
      ]
    );


    /* -----------------------------------------
       TABLE 7
       ----------------------------------------- */

    addSection(
      '7. פרמטר ניידות בשחרור',

      [
        'ציון פרמטר ניידות / אוכלוסיית מאושפזים',
        'סה"כ מאושפזים בגיל 65+ במחלקות פנימיות וכירורגיות',
        'מאושפזים בגיל 65+ בכלל המחלקות המשתתפות בתכנית הליכה',
        'סה"כ המאושפזים בגיל 65+ שהשתתפו בתכנית הליכה'
      ],

      this.mobilityDischargeTableData,

      [
        'parameter',
        'internalAndSurgical',
        'walkingProgram',
        'walkingProgramAchieved70'
      ]
    );


    /* -----------------------------------------
       TABLE 8
       ----------------------------------------- */

    addSection(
      '8. השינוי בפרמטר הניידות בין קבלה לשחרור',

      [
        'שינוי פרמטר ניידות / אוכלוסיית מאושפזים',
        'סה"כ מאושפזים בני 65+ במחלקות פנימיות וכירורגיות',
        'מאושפזים בגיל 65+ בכלל המחלקות המשתתפות בתכנית הליכה',
        'סה"כ המאושפזים בגיל 65+ שהשתתפו בתכנית הליכה'
      ],

      this.mobilityChangeTableData,

      [
        'parameter',
        'internalAndSurgical',
        'walkingProgram',
        'walkingProgramAchieved70'
      ]
    );


    /* -----------------------------------------
       TABLE 9
       ----------------------------------------- */

    addSection(
      '9. פרמטר הניידות כפי שדיווח המטופל או משפחתו',

      [
        'פרמטר ניידות / אוכלוסיית מאושפזים',
        'סה"כ מאושפזים בני 65+ במחלקות פנימיות וכירורגיות',
        'מאושפזים בגיל 65+ בכלל המחלקות המשתתפות בתכנית הליכה',
        'סה"כ המאושפזים בגיל 65+ שהשתתפו בתכנית הליכה'
      ],

      this.mobilityBasicFunctionTableData,

      [
        'parameter',
        'internalAndSurgical',
        'walkingProgram',
        'walkingProgramAchieved70'
      ]
    );


    ws['!dir'] = 'rtl';


    XLSX.utils.book_append_sheet(
      wb,
      ws,
      'דו״ח מיטב'
    );


    XLSX.writeFile(
      wb,
      'MitavSummary.xlsx'
    );
  }
}