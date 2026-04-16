import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface SchedulePattern {
  Template: string;
  Capacity: number;
  OrderedCount: number;
  Remaining: number;
}

export interface ScheduleDay {
  Date: string;
  Weekday: number;
  WeekdayName: string;
  Patterns: SchedulePattern[];
}

export interface ScheduleResponse {
  FromDate: string;
  ToDate: string;
  Days: ScheduleDay[];
}

export interface MriOrderDetail {
  Id: string;
  FirstName: string;
  LastName: string;
  Code: string;
  Hour: string;
}

const NS = 'http://tempuri.org/';

function getText(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

function getNumber(el: Element | null): number {
  const t = getText(el);
  const n = parseInt(t, 10);
  return isNaN(n) ? 0 : n;
}

function parseXmlToScheduleResponse(xmlText: string): ScheduleResponse {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const root = doc.documentElement;

  const get1 = (tag: string) => root.getElementsByTagNameNS(NS, tag)?.[0] ?? root.getElementsByTagName(tag)?.[0];
  const get1Text = (tag: string) => getText(get1(tag));

  const fromDate = get1Text('FromDate');
  const toDate = get1Text('ToDate');

  const dayNodes = root.getElementsByTagNameNS(NS, 'MriSchedulingDayDto');
  const dayList = dayNodes.length
    ? Array.from(dayNodes)
    : Array.from(root.getElementsByTagName('MriSchedulingDayDto'));

  const days: ScheduleDay[] = dayList.map((dayEl) => {
    const getDay = (tag: string) => dayEl.getElementsByTagNameNS(NS, tag)?.[0] ?? dayEl.getElementsByTagName(tag)?.[0];
    const getDayText = (tag: string) => getText(getDay(tag));
    const getDayNum = (tag: string) => getNumber(getDay(tag));

    const patternNodes = dayEl.getElementsByTagNameNS(NS, 'MriSchedulingPatternDto');
    const patternList = patternNodes.length
      ? Array.from(patternNodes)
      : Array.from(dayEl.getElementsByTagName('MriSchedulingPatternDto'));

    const patterns: SchedulePattern[] = patternList.map((pEl) => {
      const getP = (tag: string) => pEl.getElementsByTagNameNS(NS, tag)?.[0] ?? pEl.getElementsByTagName(tag)?.[0];
      return {
        Template: getText(getP('Template')),
        Capacity: getNumber(getP('Capacity')),
        OrderedCount: getNumber(getP('OrderedCount')),
        Remaining: getNumber(getP('Remaining')),
      };
    });

    return {
      Date: getDayText('Date'),
      Weekday: getDayNum('Weekday'),
      WeekdayName: getDayText('WeekdayName'),
      Patterns: patterns,
    };
  });

  return { FromDate: fromDate, ToDate: toDate, Days: days };
}

function parseXmlToOrderDetails(xmlText: string): MriOrderDetail[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const root = doc.documentElement;

  const itemNodes = root.getElementsByTagNameNS(NS, 'MriOrderDetailDto');
  const list = itemNodes.length
    ? Array.from(itemNodes)
    : Array.from(root.getElementsByTagName('MriOrderDetailDto'));

  return list.map((el) => {
    const get = (tag: string) => el.getElementsByTagNameNS(NS, tag)?.[0] ?? el.getElementsByTagName(tag)?.[0];
    return {
      Id: getText(get('Id')),
      FirstName: getText(get('FirstName')),
      LastName: getText(get('LastName')),
      Code: getText(get('Code')),
      Hour: getText(get('Hour')),
    };
  });
}

@Injectable({ providedIn: 'root' })
export class MriScheduleService {

  constructor(private http: HttpClient) {}

  getMriScheduling(fromDate: string, toDate: string): Observable<ScheduleResponse> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get(environment.url + 'GetMriScheduling', { params, responseType: 'text' }).pipe(
      map((xmlText) => parseXmlToScheduleResponse(xmlText))
    );
  }

  /** Update pattern capacity (Num) for a given Pattern and Dayy. Backend must implement this. */
  updatePattern(pattern: string, dayy: string, num: string): Observable<unknown> {
    return this.http.post(environment.url + 'UpdateMriPattern', { Pattern: pattern, Dayy: dayy, Num: num });
  }

  /** Get order details for a given date and template. GET GetMriOrderDetails?date=yyyy-MM-dd&template=... (returns XML) */
  getMriOrderDetails(date: string, template: string): Observable<MriOrderDetail[]> {
    const params = new HttpParams()
      .set('date', date)
      .set('template', template);
    return this.http.get(environment.url + 'GetMriOrderDetails', { params, responseType: 'text' }).pipe(
      map((xmlText) => parseXmlToOrderDetails(xmlText))
    );
  }
}
