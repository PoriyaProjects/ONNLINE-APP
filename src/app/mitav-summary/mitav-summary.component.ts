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

    const wb: XLSX.WorkBook =
      XLSX.utils.book_new();

    const ws: any =
      XLSX.utils.aoa_to_sheet([]);

    ws['!merges'] = [];

    let rowOffset = 0;

    const G_ALL =
      'מאושפזים בגיל 65+ שהתאשפזו בכל מחלקות בית החולים';

    const G_INT =
      'מאושפזים 65+ בכלל המחלקות באגף הפנימי והכירורגי (למעט אורתופדיה)';

    const G_TGT =
      'מאושפזים בגיל 65+ במחלקות שנבחרו להשתתף בתכנית הליכה';

    const G_TGT_SHORT =
      'מאושפזים בגיל 65+ במחלקות שנבחרו להשתתף בתכנית';

    const G_ACT =
      'מאושפזים בגיל 65+ שהשתתפו בפועל בתכנית הליכה';

    const G_ACT_T1 =
      'מאושפזים בגיל 65+ שהשתתפו בתכנית הליכה, במחלקות המשתתפות';

    /*
      Generic table writer.

      title       - gray title bar (merged across all columns)
      headerRows  - header rows below the title (may be empty)
      data        - data rows
      columns     - keys to read from each data row
      merges      - extra merges, relative to the table's title row
                    [firstRow, firstCol, lastRow, lastCol]
    */

    const addTable = (
      title: string,
      headerRows: any[][],
      data: any[],
      columns: string[],
      merges: number[][] = []
    ) => {

      const totalCols =
        columns.length;

      const startRow =
        rowOffset;

      // title row
      const titleRow: any[] =
        [title];

      for (let i = 1; i < totalCols; i++) {
        titleRow.push('');
      }

      XLSX.utils.sheet_add_aoa(
        ws,
        [titleRow],
        { origin: { r: rowOffset, c: 0 } }
      );

      ws['!merges'].push({
        s: { r: rowOffset, c: 0 },
        e: { r: rowOffset, c: totalCols - 1 }
      });

      rowOffset++;

      // header rows
      if (headerRows.length > 0) {

        XLSX.utils.sheet_add_aoa(
          ws,
          headerRows,
          { origin: { r: rowOffset, c: 0 } }
        );

        rowOffset += headerRows.length;
      }

      // data rows
      const rows =
        data.map(row =>
          columns.map(
            column => row[column]
          )
        );

      if (rows.length > 0) {

        XLSX.utils.sheet_add_aoa(
          ws,
          rows,
          { origin: { r: rowOffset, c: 0 } }
        );
      }

      rowOffset +=
        rows.length;

      // extra merges
      merges.forEach(m => {

        ws['!merges'].push({
          s: { r: startRow + m[0], c: m[1] },
          e: { r: startRow + m[2], c: m[3] }
        });
      });

      // blank rows between tables
      rowOffset += 2;
    };


    /* -----------------------------------------
       TABLE 1
       ----------------------------------------- */

    addTable(
      '1. אוכלוסיות בגיליון',

      [[G_ALL, G_INT, G_TGT, G_ACT_T1]],

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

    addTable(
      '2. משתתפים בתכנית הליכה לפי מחלקה',

      [[
        'סוג המחלקה (פנימית \\ כירורגית)',
        "שם המחלקה (למשל: כירורגיה כללית א')",
        G_TGT,
        G_ACT
      ]],

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
       (question A in row 1, question B merged over the 9 answers)
       ----------------------------------------- */

    addTable(
      '3. תכנית הליכה - שאלות כלליות',

      [],

      this.generalQuestionsData,

      [
        'question',
        'answer'
      ],

      [
        [2, 0, this.generalQuestionsData.length, 0]
      ]
    );


    /* -----------------------------------------
       TABLE 4
       ----------------------------------------- */

    addTable(
      '4. מספר מאושפזים לפי קבוצת גיל ומין',

      [
        [
          'אוכלוסיית מאושפזים',
          G_INT, '',
          G_TGT_SHORT, '',
          G_ACT, ''
        ],
        [
          'גיל / מין',
          'זכר', 'נקבה',
          'זכר', 'נקבה',
          'זכר', 'נקבה'
        ]
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
      ],

      [
        [1, 1, 1, 2],
        [1, 3, 1, 4],
        [1, 5, 1, 6]
      ]
    );


    /* -----------------------------------------
       TABLE 5
       ----------------------------------------- */

    addTable(
      '5. מספר מאושפזים לפי קבוצת גיל ומשך האשפוז',

      [
        [
          'אוכלוסיית מאושפזים',
          G_INT, '', '',
          G_TGT, '', '',
          G_ACT, '', ''
        ],
        [
          'גיל / משך אשפוז',
          'עד 3 ימים', '4-5 ימים', '6 ימים ומעלה',
          'עד 3 ימים', '4-5 ימים', '6 ימים ומעלה',
          'עד 3 ימים', '4-5 ימים', '6 ימים ומעלה'
        ]
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
      ],

      [
        [1, 1, 1, 3],
        [1, 4, 1, 6],
        [1, 7, 1, 9]
      ]
    );


    /* -----------------------------------------
       TABLES 6-9 (same structure)
       ----------------------------------------- */

    const mobilityColumns: string[] = [
      'parameter',
      'internalAndSurgical',
      'walkingProgram',
      'walkingProgramAchieved70'
    ];

    addTable(
      '6. פרמטר ניידות בקבלה',

      [[
        'פרמטר ניידות / אוכלוסיית מאושפזים',
        G_INT,
        G_TGT,
        G_ACT
      ]],

      this.mobilityAdmissionTableData,
      mobilityColumns
    );

    addTable(
      '7. פרמטר ניידות בשחרור',

      [[
        'ציון פרמטר ניידות / אוכלוסיית מאושפזים',
        G_INT,
        G_TGT,
        G_ACT
      ]],

      this.mobilityDischargeTableData,
      mobilityColumns
    );

    addTable(
      '8. השינוי בפרמטר הניידות בין מצב פרה-מורבידי לשחרור, של כל המטופלים שהיו ניידים לפני האשפוז',

      [[
        'שינוי פרמטר ניידות / אוכלוסיית מאושפזים',
        G_INT,
        G_TGT,
        G_ACT
      ]],

      this.mobilityChangeTableData,
      mobilityColumns
    );

    addTable(
      '9. פרמטר הניידות כפי שדיווח המטופל או משפחתו, טרם המצב הרפואי שהוביל לאשפוז',

      [[
        'פרמטר ניידות / אוכלוסיית מאושפזים',
        G_INT,
        G_TGT,
        G_ACT
      ]],

      this.mobilityBasicFunctionTableData,
      mobilityColumns
    );


    // sheet range + column widths
    ws['!ref'] =
      XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rowOffset, c: 9 }
      });

    ws['!cols'] = [
      { wch: 40 },
      { wch: 22 }, { wch: 22 }, { wch: 22 },
      { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }
    ];

    // right-to-left sheet
    (wb as any).Workbook = {
      Views: [{ RTL: true }]
    };

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