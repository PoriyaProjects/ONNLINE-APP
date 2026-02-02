// app.component.ts

import { Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY, Observable, Subject, timer, from } from 'rxjs';
import { catchError, concatMap, exhaustMap, filter, finalize, map, startWith, takeUntil, tap } from 'rxjs/operators';
import { ConfirmationDialogService } from '../confirmation-dialog/confirmation-dialog.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-hr-dashboard',
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.css']
})
export class HrDashboardComponent implements OnInit, OnDestroy {

  currentContact: any;
  messages = [];
  users_filter = new FormControl('');
  filteredOptions: Observable<string[]>;

  user_name = localStorage.getItem('loginUserName') || '';
  @ViewChild('scrollTarget') scrollTarget: ElementRef;
  contacts = [];
  contacts_filter = [];
  fixed_files_list = [];
  unAnsweredConversations = [];
  unAnsweredConversations_filter = [];
  selectedFile: File | null = null;
  base64String: string | ArrayBuffer | null = '';
  whatsAppGroup: FormGroup;
  newMessage: FormGroup;
  loadChat = false;
  @ViewChild('tooltipTemplate') tooltipTemplate: TemplateRef<any>;

  unAnsweredPage = 1;
  unAnsweredPageSize = 20;
  unAnsweredTotal = 0;
  private readonly refreshIntervalMs = 10000;
  private readonly destroy$ = new Subject<void>();
  private unAnsweredFilterValue = '';
  private contactsFilterValue = '';
  private readonly pendingReadUpdates = new Set<string>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private confirmationDialogService: ConfirmationDialogService,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.initMessageForm();
    this.filteredOptions = this.users_filter.valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value || ''))
    );

    this.getEmployeesForWhatsapp();
    this.getHRWhatsAppServiceFixedFiles();
    this.startBackgroundRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initMessageForm(): void {
    this.newMessage = this.fb.group({
      Row_ID: new FormControl('', null),
      Message_Text: new FormControl('', null),
      Message_Time: new FormControl('', null),
      From_ServiceEmployee: new FormControl('', null),
      ServiceIDFK: new FormControl('', null),
      ServiceEmployeeIDFK: new FormControl('', null),
      EndUserIDFK: new FormControl('', null),
      ActionIDFK: new FormControl('', null),
      Status: new FormControl('', null),
      Step: new FormControl('', null),
      Conversation_Status: new FormControl('', null),
    });
  }

  displayFiles() {
    this.dialog.open(this.tooltipTemplate, {
      width: '400px', // Adjust width as needed
    });
  }

  applyFilter(filterValue: string): void {
    this.unAnsweredFilterValue = filterValue || '';
    this.unAnsweredConversations_filter = this.filterUnAnsweredConversations(
      this.unAnsweredConversations,
      this.unAnsweredFilterValue
    );
  }

  applyFilter2(filterValue: string): void {
    this.contactsFilterValue = filterValue || '';
    this.contacts_filter = this.filterContacts(this.contacts, this.contactsFilterValue);
  }

  private _filter(value: string): string[] {
    const filterValue = this.normalizeFilterValue(value);
    return this.contacts.filter(option =>
      this.normalizeFilterValue(option?.FirstName).includes(filterValue)
    );
  }

  private normalizeFilterValue(value: string | null | undefined): string {
    return (value || '').toString().trim().toLowerCase();
  }

  private filterUnAnsweredConversations(conversations: any[], filterValue: string): any[] {
    const normalized = this.normalizeFilterValue(filterValue);
    if (!normalized) {
      return [...conversations];
    }

    return conversations.filter((conversation) => {
      const firstName = this.normalizeFilterValue(conversation?.FirstName);
      const lastName = this.normalizeFilterValue(conversation?.LastName);
      return firstName.includes(normalized) || lastName.includes(normalized);
    });
  }

  private filterContacts(contacts: any[], filterValue: string): any[] {
    const normalized = this.normalizeFilterValue(filterValue);
    if (!normalized) {
      return [...contacts];
    }

    return contacts.filter((contact) => {
      const firstName = this.normalizeFilterValue(contact?.FirstName);
      const lastName = this.normalizeFilterValue(contact?.LastName);
      const cellNumber = this.normalizeFilterValue(contact?.CellNumber);
      return (
        firstName.includes(normalized) ||
        lastName.includes(normalized) ||
        cellNumber.includes(normalized)
      );
    });
  }

  private startBackgroundRefresh(): void {
    timer(0, this.refreshIntervalMs)
      .pipe(
        filter(() => this.router.url.startsWith('/hr-dashboard')),
        exhaustMap(() =>
          this.fetchHrWhatsAppUsers(this.unAnsweredPage, this.unAnsweredPageSize).pipe(
            tap((response) => this.handleHrWhatsAppUsersResponse(response, true)),
            catchError((err) => {
              console.error("Error loading HR WhatsApp users:", err);
              return EMPTY;
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  getEmployeesForWhatsapp(): void {
    this.http
      .post(environment.url + "GetEmployeesForWhatsapp", {
        _empId: "",
        _empFirstName: "",
        _empLastName: "",
        _phoneNumber: "",
        _gender: "",
        _department: "",
        _role: "",
        _sektor: "",
        _on: "",
        _workPlace: ""
      })
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error("Error loading employees for WhatsApp:", err);
          return EMPTY;
        })
      )
      .subscribe((response) => {
        this.contacts = response["d"] || [];
        this.contacts_filter = this.filterContacts(this.contacts, this.contactsFilterValue);
        this.ensureCurrentContact();
      });
  }

  getHrWhatsAppUsers(
    page = this.unAnsweredPage,
    pageSize = this.unAnsweredPageSize,
    background = false
  ): void {
    this.fetchHrWhatsAppUsers(page, pageSize)
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error("Error loading HR WhatsApp users:", err);
          return EMPTY;
        })
      )
      .subscribe((response) => this.handleHrWhatsAppUsersResponse(response, background));
  }

  private fetchHrWhatsAppUsers(page = this.unAnsweredPage, pageSize = this.unAnsweredPageSize): Observable<any> {
    const requestPayload = {
      _user_name: this.user_name,
      type: "3",
      _page: page,
      _pageSize: pageSize
    };

    return this.http.post<any>(`${environment.url}GetHrWhatsAppUsers`, requestPayload);
  }

  private handleHrWhatsAppUsersResponse(response: any, background: boolean): void {
    this.unAnsweredConversations = response["d"] || [];
    this.unAnsweredTotal = response?.Total ?? response?.total ?? this.unAnsweredTotal;
    this.unAnsweredConversations_filter = this.filterUnAnsweredConversations(
      this.unAnsweredConversations,
      this.unAnsweredFilterValue
    );

    this.ensureCurrentContact();
    this.syncCurrentContact(background);
  }

  private ensureCurrentContact(): void {
    if (this.currentContact) {
      return;
    }

    const defaultContact = this.unAnsweredConversations[0] || this.contacts[0];
    if (!defaultContact) {
      return;
    }

    this.currentContact = defaultContact;
    if (defaultContact.Row_ID !== undefined) {
      this.loadConversation(defaultContact.CellNumber, { showLoader: true, markRead: true });
    } else if (!this.currentContact.WhatsApp_Bot_Convesations) {
      this.currentContact.WhatsApp_Bot_Convesations = [];
    }
  }

  private syncCurrentContact(background: boolean): void {
    if (!this.currentContact?.CellNumber) return;

    const updated = this.unAnsweredConversations.find(
      (contact) => contact.CellNumber === this.currentContact.CellNumber
    );

    if (updated) {
      const existingConversations = this.currentContact.WhatsApp_Bot_Convesations;
      this.currentContact = {
        ...updated,
        WhatsApp_Bot_Convesations: existingConversations || this.currentContact.WhatsApp_Bot_Convesations
      };
    }

    if (background) {
      this.refreshActiveConversationInBackground();
    }
  }

  endConversation(contact) {
    this.confirmationDialogService
      .confirm("נא לאשר..", "אתה מנסה לסיים את השיחה ? ")
      .then((confirmed) => {
        console.log("User confirmed:", confirmed);
        if (confirmed) {
          contact.WhatsApp_Bot_Convesations = [];
          this.http
            .post(environment.url + "EndHRWhatsAppConversation", {
              uncontact: contact
            })
            .pipe(
              takeUntil(this.destroy$),
              catchError((err) => {
                console.error("Error ending conversation:", err);
                return EMPTY;
              })
            )
            .subscribe((Response) => {
              if (Response["d"]) {
                this.getHrWhatsAppUsers(this.unAnsweredPage, this.unAnsweredPageSize, false);
              } else {
                alert("אירעה שגיאה בסיום שיחה");
              }
            });
        }
      })
      .catch(() =>
        console.log(
          "User dismissed the dialog (e.g., by using ESC, clicking the cross icon, or clicking outside the dialog)"
        )
      );

  }

  private refreshActiveConversationInBackground(): void {
    if (!this.currentContact?.CellNumber || this.loadChat) {
      return;
    }
    if (this.currentContact.Row_ID === undefined) {
      return;
    }
    this.loadConversation(this.currentContact.CellNumber, { showLoader: false, markRead: false });
  }

  private loadConversation(rowId: string, options: { showLoader: boolean; markRead?: boolean }): void {
    if (!rowId || !this.currentContact?.CellNumber) {
      return;
    }

    const activeCellNumber = this.currentContact.CellNumber;
    if (options.showLoader) {
      this.loadChat = true;
    }

    this.fetchConversation(rowId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (options.showLoader) {
            this.loadChat = false;
          }
        }),
        catchError((err) => {
          console.error("Error loading HR WhatsApp conversation:", err);
          return EMPTY;
        })
      )
      .subscribe((response) => {
        if (this.currentContact?.CellNumber !== activeCellNumber) {
          return;
        }
        this.currentContact.WhatsApp_Bot_Convesations = response["d"] || [];
        this.updateMessageMetadata(this.currentContact.WhatsApp_Bot_Convesations[0]);
        const rowIds = this.getUserMessageRowIds(this.currentContact.WhatsApp_Bot_Convesations);
        if (options.markRead) {
          this.markConversationAsRead(activeCellNumber, { force: true, rowIds });
        } else {
          this.markConversationAsRead(activeCellNumber, { rowIds });
        }
      });
  }

  private fetchConversation(rowId: string): Observable<any> {
    return this.http.post(environment.url + "GetHRWhatsAppConversationsByIDFK", {
      _row_ID: rowId
    });
  }

  private updateMessageMetadata(latestMessage: any): void {
    if (!latestMessage) {
      return;
    }

    this.newMessage.patchValue(
      {
        Row_ID: latestMessage.Row_ID ?? '',
        From_ServiceEmployee: latestMessage.From_ServiceEmployee ?? '',
        ServiceIDFK: latestMessage.ServiceIDFK ?? '',
        ServiceEmployeeIDFK: latestMessage.ServiceEmployeeIDFK ?? '',
        EndUserIDFK: latestMessage.EndUserIDFK ?? '',
        ActionIDFK: latestMessage.ActionIDFK ?? '',
        Status: latestMessage.Status ?? '',
        Step: latestMessage.Step ?? '',
        Conversation_Status: latestMessage.Conversation_Status ?? ''
      },
      { emitEvent: false }
    );
  }

  openChat(contact: any) {
    if (!contact) {
      return;
    }
    this.currentContact = contact;
    if (!this.currentContact.WhatsApp_Bot_Convesations) {
      this.currentContact.WhatsApp_Bot_Convesations = [];
    }
    if (contact.Row_ID !== undefined) {
      this.loadConversation(contact.CellNumber, { showLoader: true, markRead: true });
    }
  }

  sendMessage() {
    if (!this.currentContact) {
      return;
    }
    const messageText = (this.newMessage.controls['Message_Text'].value || '').toString().trim();
    const filePayload = this.getFilePayload();
    const fileBase64 = filePayload ? filePayload.split(',')[1] : '';

    if (!messageText && !fileBase64) {
      return;
    }

    this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.user_name);
    this.http
      .post(environment.url + "SendHrWhatsAppMessageToUser", {
        messageForm: this.newMessage.value,
        file: fileBase64,
        type: ''
      })
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error("Error sending message:", err);
          return EMPTY;
        })
      )
      .subscribe((Response) => {
        if (Response["d"]) {
          this.appendOutgoingMessage(messageText, !!fileBase64);
          this.newMessage.controls['Message_Text'].setValue('');
          this.clearFileSelection();
          this.refreshActiveConversationInBackground();
        } else {
          alert("Error");
        }
      });
  }

  sendOneWayMessage() {
    if (!this.currentContact) {
      return;
    }
    const messageText = (this.newMessage.controls['Message_Text'].value || '').toString().trim();
    const filePayload = this.getFilePayload();
    const fileBase64 = filePayload ? filePayload.split(',')[1] : '';

    if (!messageText && !fileBase64) {
      return;
    }

    this.newMessage.controls['ServiceEmployeeIDFK'].setValue(this.currentContact.CellNumber);
    this.newMessage.controls['EndUserIDFK'].setValue(this.currentContact.FirstName + ' ' + this.currentContact.LastName);
    this.http
      .post(environment.url + "SendHrWhatsAppMessageToUserOneWay", {
        messageForm: this.newMessage.value,
        file: fileBase64,
        type: "3"
      })
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error("Error sending one-way message:", err);
          return EMPTY;
        })
      )
      .subscribe((Response) => {
        if (Response["d"]) {
          alert("הודעה נשלחה בהצלחה");
          this.appendOutgoingMessage(messageText, !!fileBase64);
          this.newMessage.controls['Message_Text'].setValue('');
          this.clearFileSelection();
        } else {
          alert("הודעה לא נשלחה עקב תקלה");
        }
      });
  }

  private appendOutgoingMessage(messageText: string, hasFile: boolean): void {
    if (!this.currentContact) {
      return;
    }

    if (!this.currentContact.WhatsApp_Bot_Convesations) {
      this.currentContact.WhatsApp_Bot_Convesations = [];
    }

    const outgoingMessage: any = {
      Message_Text: messageText,
      From_ServiceEmployee: 'True',
      IfFileMessage: hasFile ? 'True' : 'False'
    };

    if (hasFile) {
      const filePayload = this.getFilePayload();
      if (filePayload) {
        outgoingMessage.Message_Text = filePayload;
        outgoingMessage.FileType = this.selectedFile?.type?.startsWith('image/') ? 'image' : 'pdf';
      }
    }

    this.currentContact.WhatsApp_Bot_Convesations.push(outgoingMessage);
  }

  private getFilePayload(): string {
    if (!this.base64String || typeof this.base64String !== 'string') {
      return '';
    }
    return this.base64String;
  }

  private clearFileSelection(): void {
    this.selectedFile = null;
    this.base64String = '';
  }

  private isUserMessage(message: any): boolean {
    const flag = message?.From_ServiceEmployee;
    return flag === false || flag === 'False' || flag === 0 || flag === '0';
  }

  private getUserMessageRowIds(messages: any[]): string[] {
    if (!Array.isArray(messages)) {
      return [];
    }

    const rowIds = messages
      .filter((message) => this.isUserMessage(message))
      .map((message) => (message?.Row_ID ?? message?.RowID ?? '').toString().trim())
      .filter((rowId) => rowId !== '');

    return Array.from(new Set(rowIds));
  }

  getUnreadCount(contact: any): number {
    if (!contact) {
      return 0;
    }

    const candidates = [
      'UnreadCount',
      'UnreadMessagesCount',
      'UnreadMessages',
      'NumberOfUnread',
      'unreadMessages',
      'UnReadMessages',
      'NotRead',
      'NotReadCount',
      'Unread',
      'unread',
      'Unread_Messages',
      'NotReadMessages',
      'ReadByUser',
      'readByUser',
      'IsRead',
      'isRead'
    ];

    const readFlagKeys = new Set(['ReadByUser', 'readByUser', 'IsRead', 'isRead']);

    for (const key of candidates) {
      const value = contact[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (readFlagKeys.has(key)) {
        if (typeof value === 'boolean') {
          return value ? 0 : 1;
        }
        if (typeof value === 'string') {
          const normalized = value.trim().toLowerCase();
          if (normalized === 'true') {
            return 0;
          }
          if (normalized === 'false') {
            return 1;
          }
        }
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed > 0 ? 0 : 1;
        }
      } else {
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }

        if (typeof value === 'string') {
          const normalized = value.trim().toLowerCase();
          if (normalized === 'true') {
            return 1;
          }
          if (normalized === 'false') {
            return 0;
          }
        }

        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return 0;
  }

  private getUnreadCountForCellNumber(cellNumber: string): number {
    const contact = this.unAnsweredConversations.find(
      (item) => item?.CellNumber === cellNumber
    );
    if (contact) {
      return this.getUnreadCount(contact);
    }
    if (this.currentContact?.CellNumber === cellNumber) {
      return this.getUnreadCount(this.currentContact);
    }
    return 0;
  }

  private clearUnreadCountForContact(contact: any): void {
    if (!contact) {
      return;
    }

    const keys = [
      'UnreadCount',
      'UnreadMessagesCount',
      'UnreadMessages',
      'NumberOfUnread',
      'unreadMessages',
      'UnReadMessages',
      'NotRead',
      'NotReadCount',
      'Unread',
      'unread',
      'Unread_Messages',
      'NotReadMessages',
      'ReadByUser',
      'readByUser',
      'IsRead',
      'isRead'
    ];

    const readFlagKeys = new Set(['ReadByUser', 'readByUser', 'IsRead', 'isRead']);
    let updated = false;
    for (const key of keys) {
      if (contact[key] !== undefined) {
        contact[key] = readFlagKeys.has(key) ? 1 : 0;
        updated = true;
      }
    }

    if (!updated) {
      contact.UnreadCount = 0;
    }
  }

  private clearUnreadCountForCellNumber(cellNumber: string): void {
    let updatedList = false;
    this.unAnsweredConversations.forEach((item) => {
      if (item?.CellNumber === cellNumber) {
        this.clearUnreadCountForContact(item);
        updatedList = true;
      }
    });

    if (this.currentContact?.CellNumber === cellNumber) {
      this.clearUnreadCountForContact(this.currentContact);
    }

    if (updatedList) {
      this.unAnsweredConversations_filter = this.filterUnAnsweredConversations(
        this.unAnsweredConversations,
        this.unAnsweredFilterValue
      );
    }
  }

  private markConversationAsRead(
    cellNumber: string,
    options: { force?: boolean; rowIds?: string[] } = {}
  ): void {
    if (!cellNumber || !this.user_name) {
      return;
    }

    const normalized = cellNumber.toString().trim();
    if (!normalized) {
      return;
    }

    if (!options.force) {
      const unreadCount = this.getUnreadCountForCellNumber(normalized);
      if (unreadCount <= 0) {
        return;
      }
    }

    const rowIds = (options.rowIds || []).filter((rowId) => rowId);
    if (rowIds.length === 0) {
      return;
    }

    const rowIdsToUpdate = rowIds.filter((rowId) => !this.pendingReadUpdates.has(rowId));
    if (rowIdsToUpdate.length === 0) {
      return;
    }

    rowIdsToUpdate.forEach((rowId) => this.pendingReadUpdates.add(rowId));
    from(rowIdsToUpdate)
      .pipe(
        concatMap((rowId) =>
          this.http.get(environment.url + "updateRowToReaded", {
            params: {
              RowID: rowId,
              UserName: this.user_name
            }
          }).pipe(
            catchError((err) => {
              console.error("Error updating read status:", err);
              return EMPTY;
            }),
            finalize(() => this.pendingReadUpdates.delete(rowId))
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        complete: () => this.clearUnreadCountForCellNumber(normalized)
      });
  }

  private extractUrlFromText(text: string): string | null {
    if (!text) {
      return null;
    }

    const match = text.match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : null;
  }

  private isImageUrl(url: string): boolean {
    return /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(url);
  }

  private isPdfUrl(url: string): boolean {
    return /\.pdf(\?|#|$)/i.test(url);
  }

  getMessageLinkInfo(message: any): { type: 'image' | 'pdf' | 'link'; url: string } | null {
    const text = (message?.Message_Text || '').toString();
    const url = this.extractUrlFromText(text);
    if (!url) {
      return null;
    }

    if (this.isImageUrl(url)) {
      return { type: 'image', url };
    }

    if (this.isPdfUrl(url)) {
      return { type: 'pdf', url };
    }

    return { type: 'link', url };
  }

  shouldRenderMessageText(message: any, linkInfo: { url: string } | null): boolean {
    if (!linkInfo) {
      return true;
    }
    const text = (message?.Message_Text || '').toString().trim();
    return text !== linkInfo.url;
  }

  trackByContact(index: number, contact: any): string | number {
    return contact?.CellNumber ?? contact?.Row_ID ?? index;
  }

  trackByConversation(index: number, message: any): string | number {
    return message?.Row_ID ?? message?.Message_Time ?? index;
  }

  trackByFixedFile(index: number, item: any): string | number {
    return item?.File_Numeric ?? item?.File_Name ?? index;
  }

  getHRWhatsAppServiceFixedFiles() {
    this.http
      .post(environment.url + "GetHRWhatsAppServiceFixedFiles", {
        _user_name: this.user_name
      })
      .pipe(
        takeUntil(this.destroy$),
        catchError((err) => {
          console.error("Error loading fixed files:", err);
          return EMPTY;
        })
      )
      .subscribe((Response) => {
        this.fixed_files_list = Response["d"] || [];
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.convertFileToBase64(this.selectedFile);
    }
  }

  convertFileToBase64(file: File): void {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.base64String = reader.result;
    };
    reader.onerror = (error) => {
      console.error('Error: ', error);
    };
  }

  async convertBase64ToPDF(base64Data: string, fileName: string, file_type: string) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file_type });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    // Append the link element to the DOM
    document.body.appendChild(a);

    // Trigger the download
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async downloadPDF(base64Data, message) {
    try {
      // Replace 'your-base64-data' with the actual Base64 data
      base64Data = base64Data.replace('data:image/png;base64,', '');
      base64Data = base64Data.replace('data:application/pdf;base64,', '');
      const file_type = await this.detectFileType(base64Data);
      // Replace 'filename.pdf' with the desired file name
      let fileName = "";
      if (file_type == 'application/pdf') fileName = 'HR_WhatsApp_Service_Media_File.pdf';
      else fileName = 'HR_WhatsApp_Service_Media_File.png';

      await this.convertBase64ToPDF(base64Data, fileName, file_type);
    } catch (error) {
      console.error('Error downloading File:', error);
    }
  }

  async detectFileType(base64Data) {
    const decodedData = atob(base64Data);
    const byte1 = decodedData.charCodeAt(0);
    const byte2 = decodedData.charCodeAt(1);

    // Check for common image file signatures
    if (byte1 === 0xff && byte2 === 0xd8) {
      return 'image/jpeg';
    } else if (byte1 === 0x89 && byte2 === 0x50) {
      return 'image/png';
    } else if (byte1 === 0x47 && byte2 === 0x49) {
      return 'image/gif';
    }

    // Check for PDF file signature
    if (byte1 === 0x25 && byte2 === 0x50) {
      return 'application/pdf';
    }

    // Unknown file type
    return 'unknown';
  }

  // Paging controls for unAnsweredConversations
  nextUnAnsweredPage() {
    this.unAnsweredPage++;
    this.getHrWhatsAppUsers(this.unAnsweredPage, this.unAnsweredPageSize);
    // if (this.unAnsweredPage * this.unAnsweredPageSize <= this.unAnsweredTotal) {
    // }
  }
  prevUnAnsweredPage() {
    if (this.unAnsweredPage > 1) {
      this.unAnsweredPage--;
      this.getHrWhatsAppUsers(this.unAnsweredPage, this.unAnsweredPageSize);
    }
  }

  calculateAllUnAnswered() {
    return Math.ceil(this.unAnsweredTotal / this.unAnsweredPageSize);
  }

}