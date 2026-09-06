import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SecondaryDecisionRow,
  buildSecondaryDecisionRows,
  isViewOnlyUser
} from '../commercial-support.constants';
import { SupportRequestService } from '../commercial-support.service';

export interface SecondaryAttachmentItem {
  label: string;
  key: string;
  hasFile: boolean;
}

@Component({
  selector: 'app-secondary-decision-step',
  templateUrl: './secondary-decision-step.component.html',
  styleUrls: ['./secondary-decision-step.component.css']
})
export class SecondaryDecisionStepComponent implements OnInit, OnChanges {
  @Input() requestId: string;
  @Input() roler: string;
  @Input() userName: string;
  @Input() showEditForm = false;
  @Input() showTable = true;
  @Input() showAttachments = true;
  @Input() attachments: SecondaryAttachmentItem[] = [];
  @Input() savedDecisions: any[] = [];

  @Output() viewAttachment = new EventEmitter<string>();
  @Output() decisionsChanged = new EventEmitter<any[]>();

  decisionForm: FormGroup;
  decisionRows: SecondaryDecisionRow[] = [];
  displayedColumns = ['displayName', 'decisionDate', 'approved', 'note'];
  saving = false;

  constructor(
    private fb: FormBuilder,
    private supportRequestService: SupportRequestService,
    private datePipe: DatePipe,
    private snackBar: MatSnackBar
  ) {
    this.decisionForm = this.fb.group({
      DecisionDate: new FormControl(null),
      Approved: new FormControl(''),
      Note: new FormControl('')
    });
  }

  ngOnInit(): void {
    this.refreshRows();
    this.patchCurrentUserForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['savedDecisions']) {
      this.refreshRows();
      this.patchCurrentUserForm();
    }
  }

  private refreshRows(): void {
    this.decisionRows = buildSecondaryDecisionRows(this.savedDecisions || []);
  }

  private patchCurrentUserForm(): void {
    if (!this.showEditForm || !isViewOnlyUser(this.userName)) {
      return;
    }
    const me = (this.userName || '').toLowerCase();
    const mine = (this.savedDecisions || []).find(
      (r) => (r.UserName || '').toLowerCase() === me
    );
    if (!mine) {
      return;
    }
    this.decisionForm.patchValue({
      DecisionDate: mine.DecisionDate || null,
      Approved: mine.Approved || '',
      Note: mine.Note || ''
    });
  }

  onViewFile(key: string): void {
    this.viewAttachment.emit(key);
  }

  saveDecision(): void {
    if (!this.requestId || !this.roler || !this.userName) {
      return;
    }
    this.saving = true;
    const decisionDate = this.decisionForm.value.DecisionDate
      ? this.datePipe.transform(this.decisionForm.value.DecisionDate, 'yyyy-MM-dd')
      : '';
    this.supportRequestService
      .saveSupportSecondaryDecision(
        String(this.requestId),
        this.roler,
        this.userName,
        decisionDate || '',
        this.decisionForm.value.Approved || '',
        this.decisionForm.value.Note || ''
      )
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('ההחלטה נשמרה', 'סגור', { duration: 2500 });
          this.reloadDecisions();
        },
        error: () => {
          this.saving = false;
          this.snackBar.open('שגיאה בשמירת ההחלטה', 'סגור', { duration: 3000 });
        }
      });
  }

  private reloadDecisions(): void {
    this.supportRequestService
      .getSupportSecondaryDecisions(String(this.requestId), this.roler)
      .subscribe({
        next: (res) => {
          const list = res?.d || res || [];
          this.savedDecisions = Array.isArray(list) ? list : [];
          this.refreshRows();
          this.patchCurrentUserForm();
          this.decisionsChanged.emit(this.savedDecisions);
        }
      });
  }
}
