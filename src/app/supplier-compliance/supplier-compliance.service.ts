import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { DocumentHistory, DocumentType, Supplier, SupplierOptions, SupplierUpsert } from './supplier-compliance.models';

// The backend is the shared ASMX service in RCF_WS (App_Code\Suppliers). Three consequences
// are handled in this file and nowhere else, so components and models stay unchanged:
//
//   1. Every response is wrapped by ASP.NET AJAX as { "d": <payload> } and has to be unwrapped.
//   2. Errors arrive as HTTP 500 with { Message, StackTrace, ExceptionType } instead of the
//      { error: "..." } / ValidationProblemDetails shapes the modals parse. See asmxError.
//   3. Everything is POSTed — including reads. ASMX only accepts a GET for a method marked
//      [ScriptMethod(UseHttpGet = true)], which these are not; POST with a JSON body works
//      for every [WebMethod] with no extra attribute.
//
// BASE_URL reuses the ONN-LINE app's own environment.url, which already points at
// .../WebService.asmx/ for this deployment, so dev/test/prod switch automatically with the
// rest of the app — nothing else in this file needs to know the actual host or path.
const BASE_URL = (environment.url || '').replace(/\/?$/, '/');

const JSON_HEADERS = new HttpHeaders({ 'Content-Type': 'application/json' });

@Injectable({ providedIn: 'root' })
export class SupplierComplianceService {
  constructor(private http: HttpClient) {}

  // Argument names in `args` must match the [WebMethod] parameter names exactly — ASMX binds
  // them by name, and a mismatch silently passes null rather than failing loudly.
  private call<T>(method: string, args: Record<string, unknown> = {}): Observable<T> {
    return this.http.post<{ d: T }>(`${BASE_URL}${method}`, stripAsmxType(args), { headers: JSON_HEADERS }).pipe(
      map((response) => response.d),
      catchError(asmxError),
    );
  }

  getAll(): Observable<Supplier[]> {
    return this.call<Supplier[]>('GetSuppliers');
  }

  getById(id: number): Observable<Supplier> {
    return this.call<Supplier>('GetSupplierById', { id });
  }

  getOptions(): Observable<SupplierOptions> {
    return this.call<SupplierOptions>('GetSupplierOptions');
  }

  create(dto: SupplierUpsert): Observable<Supplier> {
    return this.call<Supplier>('CreateSupplier', { dto });
  }

  update(id: number, dto: SupplierUpsert): Observable<Supplier> {
    return this.call<Supplier>('UpdateSupplier', { id, dto });
  }

  // Audit log of document status changes for one supplier, newest first.
  getDocumentHistory(id: number): Observable<DocumentHistory> {
    return this.call<DocumentHistory>('GetSupplierDocumentHistory', { id });
  }

  getDocumentTypes(): Observable<DocumentType[]> {
    return this.call<DocumentType[]>('GetSupplierDocumentTypes');
  }

  createDocumentType(dto: Omit<DocumentType, 'id'>): Observable<DocumentType> {
    return this.call<DocumentType>('CreateSupplierDocumentType', { dto });
  }

  updateDocumentType(id: number, dto: Omit<DocumentType, 'id'>): Observable<DocumentType> {
    return this.call<DocumentType>('UpdateSupplierDocumentType', { id, dto });
  }

  // Nature ("מהות הספק") categories share the DocumentType shape on purpose — same
  // id/label/isActive/displayOrder catalog pattern, managed from the same admin modal.
  getNatureTypes(): Observable<DocumentType[]> {
    return this.call<DocumentType[]>('GetSupplierNatureTypes');
  }

  createNatureType(dto: Omit<DocumentType, 'id'>): Observable<DocumentType> {
    return this.call<DocumentType>('CreateSupplierNatureType', { dto });
  }

  updateNatureType(id: number, dto: Omit<DocumentType, 'id'>): Observable<DocumentType> {
    return this.call<DocumentType>('UpdateSupplierNatureType', { id, dto });
  }
}

// ASMX responses tag every object with a "__type" hint (e.g. "SupplierDto"). When such an
// object is edited in a modal and posted back as a SupplierUpsertDto parameter, the
// JavaScriptSerializer obeys the stale hint and fails with "Cannot convert object of type
// 'SupplierDto' to type 'SupplierUpsertDto'" — so every outgoing payload is scrubbed here.
function stripAsmxType(value: unknown): any {
  if (Array.isArray(value)) return value.map(stripAsmxType);
  if (value !== null && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      if (key === '__type') continue;
      clean[key] = stripAsmxType((value as Record<string, unknown>)[key]);
    }
    return clean;
  }
  return value;
}

// Rewrites an ASMX fault into the { error: "..." } body the supplier modal already knows how
// to describe, so the real reason a save failed still reaches the user instead of a bare
// "שגיאה 500". A genuine transport failure (status 0) has no Message and is rethrown untouched.
function asmxError(err: HttpErrorResponse): Observable<never> {
  const message = typeof err.error?.Message === 'string' ? err.error.Message : null;
  if (!message) return throwError(err);

  return throwError(
    new HttpErrorResponse({
      error: { error: message },
      headers: err.headers,
      status: err.status,
      statusText: err.statusText,
      url: err.url ?? undefined,
    }),
  );
}
