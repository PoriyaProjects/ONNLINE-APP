import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

function getMonthStartEnd(): { start: string, end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

export interface HearingCounts {
  A: number; C: number; D: number; E: number; F: number; G: number; H: number;
  I: number; J: number; K: number; L: number; M: number; O: number; P: number; Q: number;
  B?: number; N?: number;
}

interface TableRow {
  index: number;
  description: string;
  totalKey: keyof HearingCounts;
  splitKeys?: { key: keyof HearingCounts; label: string }[];
}

@Component({
  selector: 'app-hearing-survey',
  templateUrl: './hearing-survey.component.html',
  styleUrls: ['./hearing-survey.component.css']
})
export class HearingSurveyComponent implements OnInit {
  startDate: string = '';
  endDate: string = '';
  loading = false;
  error: string | null = null;
  counts: HearingCounts | null = null;

  readonly tableRows: TableRow[] = [
    {
      index: 1,
      description: "מס' היילודים ששוחררו מבית החולים. (אם לא ניתן לספק נתון זה, אנא ציינו מספר לידות חי)",
      totalKey: 'A',
    },
    {
      index: 3,
      description: "מס' היילודים ששוחררו ונבדקו בפרוטוקול סינון",
      totalKey: 'C',
      splitKeys: [
        { key: 'D', label: 'D' },
        { key: 'E', label: 'E' },
        { key: 'F', label: 'F' },
      ],
    },
    {
      index: 4,
      description: "מס' היילודים שעשו בדיקה במסגרת האשפוז, וקיבלו אבחנה ולא השלימו",
      totalKey: 'G',
    },
    {
      index: 5,
      description: "מס' היילודים ששוחררו ללא בדיקות סינון כלל",
      totalKey: 'H',
    },
    {
      index: 6,
      description: "סכום האבחנות 796.61/796.62/796.63 מקבוצה 1 (האבחנה החדשה ביותר)",
      totalKey: 'I',
      splitKeys: [
        { key: 'K', label: '796.61' },
        { key: 'L', label: '796.62' },
        { key: 'M', label: '796.63' },
      ],
    },
    {
      index: 16,
      description: "מספר היילודים שהופנו ל-AABR בגלל כישלון בבדיקת OAE",
      totalKey: 'J',
      splitKeys: [
        { key: 'O', label: '796.64' },
        { key: 'P', label: '796.65' },
        { key: 'Q', label: '796.66' },
      ],
    },
  ];

  readonly splitColumnKeys = ['D', 'E', 'F', 'K', 'L', 'M', 'O', 'P', 'Q'] as const;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Do not set default dates or run the report automatically
  }

  runSurvey() {
    if (!this.startDate || !this.endDate) {
      this.error = 'יש לבחור תאריכים';
      return;
    }
    this.loading = true;
    this.error = null;
    this.counts = null;
    this.getCounts(this.startDate, this.endDate).then(
      data => {
        this.counts = data;
        this.loading = false;
      },
      err => {
        this.error = typeof err === 'string' ? err : (err?.message || 'Unknown error');
        this.loading = false;
      }
    );
  }

  getCounts(dateIn: string, dateOut: string): Promise<HearingCounts> {
    const params = new HttpParams().set('dateIn', dateIn).set('dateOut', dateOut);
    const baseUrl = environment.url || '/WebService.asmx/';
    const url = baseUrl.replace(/\/?$/, '/') + 'GetHearingCounts';
    return this.http.get(url, { params, responseType: 'text' }).toPromise().then(xml => this.parseHearingCountsXml(xml));
  }

  parseHearingCountsXml(xml: string): HearingCounts {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const ns = 'http://tempuri.org/';
      const getVal = (tag: string) => {
        const el = doc.getElementsByTagNameNS(ns, tag)[0];
        return el && el.textContent ? parseInt(el.textContent, 10) : 0;
      };
      return {
        A: getVal('A'),
        C: getVal('C'),
        D: getVal('D'),
        E: getVal('E'),
        F: getVal('F'),
        G: getVal('G'),
        H: getVal('H'),
        I: getVal('I'),
        J: getVal('J'),
        K: getVal('K'),
        L: getVal('L'),
        M: getVal('M'),
        O: getVal('O'),
        P: getVal('P'),
        Q: getVal('Q'),
        B: getVal('B'),
        N: getVal('N'),
      };
    } catch (e) {
      throw new Error('Failed to parse HearingCounts XML: ' + e);
    }
  }

  getSplitValue(row: TableRow, key: keyof HearingCounts): number | '' {
    if (!row.splitKeys?.some(s => s.key === key)) return '';
    return this.counts ? this.counts[key] || 0 : 0;
  }
}
