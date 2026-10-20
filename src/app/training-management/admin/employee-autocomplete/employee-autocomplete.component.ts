import { Component, forwardRef, Input, OnDestroy, OnInit } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { unwrapAsmxResponse } from '../../utils/training-asmx.util';

export interface TrainingEmployeeOption {
  id: string;
  displayName: string;
  email?: string;
  adUserName?: string;
  department?: string;
}

@Component({
  selector: 'app-training-employee-autocomplete',
  templateUrl: './employee-autocomplete.component.html',
  styleUrls: ['./employee-autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TrainingEmployeeAutocompleteComponent),
      multi: true,
    },
  ],
})
export class TrainingEmployeeAutocompleteComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() label = 'בחירת עובד';
  @Input() required = false;

  searchControl = new FormControl('');
  filtered$: Observable<TrainingEmployeeOption[]> = of([]);
  private allEmployees: TrainingEmployeeOption[] = [];
  private destroy$ = new Subject<void>();
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.filtered$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(150),
      map((value) => this.filterEmployees(value))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: string | null): void {
    if (!value) {
      this.searchControl.setValue('', { emitEvent: false });
      return;
    }
    const found = this.allEmployees.find((e) => e.id === value);
    this.searchControl.setValue(found ? found.displayName : value, { emitEvent: false });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.searchControl.disable({ emitEvent: false });
    } else {
      this.searchControl.enable({ emitEvent: false });
    }
  }

  displayFn(option: TrainingEmployeeOption | string | null): string {
    if (!option) {
      return '';
    }
    if (typeof option === 'string') {
      return option;
    }
    return option.displayName;
  }

  onOptionSelected(option: TrainingEmployeeOption): void {
    this.onChange(option.id);
    this.onTouched();
  }

  onBlur(): void {
    this.onTouched();
    const raw = this.searchControl.value;
    if (typeof raw === 'string') {
      const found = this.allEmployees.find(
        (e) => e.displayName === raw || e.id === raw || e.displayName.toLowerCase() === raw.toLowerCase()
      );
      this.onChange(found ? found.id : null);
    }
  }

  private loadEmployees(): void {
    this.http
      .post(environment.url + 'GetUsersForInquiries', {})
      .pipe(
        takeUntil(this.destroy$),
        map((raw) => unwrapAsmxResponse<Record<string, unknown>[]>(raw) || []),
        catchError(() => of([] as Record<string, unknown>[]))
      )
      .subscribe((rows) => {
        this.allEmployees = (rows || []).map((el) => ({
          id: String(el['id'] || el['EmployeeID'] || ''),
          displayName: `${el['firstname'] || el['FirstName'] || ''} ${el['lastname'] || el['LastName'] || ''}`.trim(),
          email: (el['email'] || el['Email']) as string | undefined,
          adUserName: el['ADUserName'] as string | undefined,
          department: (el['DepartnentDescripton'] || el['DepartmentDescription'] || '') as string,
        })).filter((e) => e.id && e.displayName);
        const currentId = this.searchControl.value;
        if (typeof currentId === 'string' && currentId && /^\d+$/.test(currentId)) {
          this.writeValue(currentId);
        }
      });
  }

  private filterEmployees(value: string | TrainingEmployeeOption | null): TrainingEmployeeOption[] {
    const term =
      typeof value === 'string'
        ? value.trim().toLowerCase()
        : value && value.displayName
        ? value.displayName.toLowerCase()
        : '';
    if (!term) {
      return this.allEmployees.slice(0, 40);
    }
    return this.allEmployees
      .filter(
        (e) =>
          e.displayName.toLowerCase().indexOf(term) >= 0 ||
          e.id.indexOf(term) >= 0 ||
          (e.adUserName && e.adUserName.toLowerCase().indexOf(term) >= 0) ||
          (e.department && e.department.toLowerCase().indexOf(term) >= 0)
      )
      .slice(0, 40);
  }
}
