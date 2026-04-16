
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { sanitizeApiJson } from '../utils/sanitize-util';
import { environment } from 'src/environments/environment';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { Department, TimeType } from '../models/department.model';
import { fetchSanitized } from '../utils/api-utils';


@Injectable({ providedIn: 'root' })


export class DepartmentService {
  constructor(private http: HttpClient) {}

  getDepartments(): Observable<Department[]> {
    return fetchSanitized<Department>(
      this.http,
      //API_ENDPOINTS.DEPARTMENTS,
      API_ENDPOINTS.DIMDEPARTMENTS,
      [
        { id: 1, name: 'ניתוחים' },
        { id: 2, name: 'מרפאות ומכונים' },
        { id: 3, name: 'מכון רנטגן' },
        { id: 4, name: 'פעולות' },
        { id: 5, name: 'מחלקות אשפוז' },
        { id: 6, name: 'מלר"ד' },
        { id: 7, name: 'חדר לידה' },
        { id: 8, name: 'דיאליזה' },
        { id: 9, name: 'גסטרו' },
        { id: 10, name: 'צנתורים' },
        { id: 11, name: 'מרפאות מיוחדות' },
        { id: 12, name: 'אקו' }
      ],
      'id-name'
    );
  }

  getTimeTypes(): Observable<TimeType[]> {
    return fetchSanitized<TimeType>(
      this.http,
      API_ENDPOINTS.PERIODS,
      //API_ENDPOINTS.DIMPERIODS,
      [
        { id: 1, name: 'שבוע אחרון' },
        { id: 2, name: 'חודש נוכחי' },
        { id: 3, name: '3 חודשים אחרונים' },
        { id: 4, name: '12 חודשים אחרונים' }
      ],
      'id-name'
    );
  }
}


@Injectable({ providedIn: 'root' })
export class TimePeriodService {
  constructor(private http: HttpClient) {}

  getTimePeriods(): Observable<TimeType[]> {
    return fetchSanitized<TimeType>(
      this.http,
      API_ENDPOINTS.PERIODS,
      //API_ENDPOINTS.DIMPERIODS,
      [
        { id: 1, name: 'שבוע אחרון' },
        { id: 2, name: 'חודש נוכחי' },
        { id: 3, name: '3 חודשים אחרונים' },
        { id: 4, name: '12 חודשים אחרונים' }
      ],
      'id-name'
    );
  }
}

