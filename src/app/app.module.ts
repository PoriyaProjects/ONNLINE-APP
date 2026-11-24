import { AgmCoreModule } from '@agm/core';
import { NgxMatDatetimePickerModule, NgxMatNativeDateModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { DatePipe, registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import localeHe from '@angular/common/locales/he';
import { LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule } from "@angular/material-moment-adapter";
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule } from '@angular/router';
import { JpTimeMaskModule } from '@julianobrasil/timemask';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SpreadsheetAllModule } from '@syncfusion/ej2-angular-spreadsheet';
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { DataTablesModule } from 'angular-datatables';
import { AngularDualListBoxModule } from 'angular-dual-listbox';
import { GoogleChartsModule } from 'angular-google-charts';
import { FlatpickrModule } from 'angularx-flatpickr';
import { MatTableExporterModule } from 'mat-table-exporter';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { NgxBarcodeModule } from 'ngx-barcode';
import { NgxBarCodePutModule } from 'ngx-barcodeput';
import { IConfig, NgxMaskModule } from 'ngx-mask';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { AddpatientcoronaformComponent } from './addpatientcoronaform/addpatientcoronaform.component';
import { AppComponent } from './app.component';
import { AddEditAuthorizedComponent } from './authorized/add-edit-authorized/add-edit-authorized.component';
import { AuthorizedComponent } from './authorized/authorized.component';
import { BTirmComponent } from './b-tirm/b-tirm.component';
import { AddOrEditCablesComponent } from './cables/add-or-edit-cables/add-or-edit-cables.component';
import { CablesComponent } from './cables/cables.component';
import { CAMEstimateComponent } from './cam-estimate/cam-estimate.component';
import { AddupdateactionComponent } from './cardiology-calendar/addupdateaction/addupdateaction.component';
import { CardiologyCalendarComponent } from './cardiology-calendar/cardiology-calendar.component';
import { CaseinvoisesComponent } from './caseinvoises/caseinvoises.component';
import { CasenumbersComponent } from './casenumbers/casenumbers.component';
import { CathReportComponent } from './cath-report/cath-report.component';
import { ChadsComponent } from './chads/chads.component';
import { CheckpatientinsmartclosetComponent } from './checkpatientinsmartcloset/checkpatientinsmartcloset.component';
import { CliniDataComponent } from './clinic-activity-dashboard/clini-data/clini-data.component';
import { ClinicActivityDashboardComponent } from './clinic-activity-dashboard/clinic-activity-dashboard.component';
import { ClinicsDashboardComponent } from './clinics-dashboard/clinics-dashboard.component';
import { ClinicsPatientRequestsDialogComponent } from './clinics-requests/clinics-patient-requests-dialog/clinics-patient-requests-dialog.component';
import { ClinicsRequestsDialogComponent } from './clinics-requests/clinics-requests-dialog/clinics-requests-dialog.component';
import { ClinicsRequestsComponent } from './clinics-requests/clinics-requests.component';
import { ColonoscopyComponent } from './colonoscopy/colonoscopy.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogService } from './confirmation-dialog/confirmation-dialog.service';
import { ConsultationsComponent } from './consultations/consultations.component';
import { FollowUpComponent } from './consultations/follow-up/follow-up.component';
import { AppRoutingModule } from './core/app.routing.module';
import { CustomMaterialModule } from './core/material.module';
import { CoronaformComponent } from './coronaform/coronaform.component';
import { CoronaresultformComponent } from './coronaresultform/coronaresultform.component';
import { CoronavaccineComponent } from './coronavaccine/coronavaccine.component';
import { CortinasComponent } from './cortinas/cortinas.component';
import { CortinasdepartsComponent } from './cortinasdeparts/cortinasdeparts.component';
import { CortinasnotificationComponent } from './cortinasnotification/cortinasnotification.component';
import { Covid19reportComponent } from './covid19report/covid19report.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FeedLineComponent } from './dashboard/feed-line/feed-line.component';
import { FolderTreeComponent } from './dashboard/folder-tree/folder-tree.component';
import { NamerUserActionsComponent } from './dashboard/namer-user-actions/namer-user-actions.component';
import { ShortcutFormDialogComponent } from './dashboard/shortcuts-management/shortcut-form-dialog/shortcut-form-dialog.component';
import { ShortcutsManagementComponent } from './dashboard/shortcuts-management/shortcuts-management.component';
import { DevManageComponent } from './dev-manage/dev-manage.component';
import { DialysisReportComponent } from './dialysis-report/dialysis-report.component';
import { DialysisReportPatientsComponent } from './dialysis-report/dialysis-report-patients/dialysis-report-patients.component';
import { DimotComponent } from './dimot/dimot.component';
import { DrugProtocolsComponent } from './drug-protocols/drug-protocols.component';
import { DrugsComponent } from './drugs/drugs.component';
import { DrugsnicComponent } from './drugsnic/drugsnic.component';
import { EditOrAddWorkerCaseDialogComponent } from './edit-or-add-worker-case-dialog/edit-or-add-worker-case-dialog.component';
import { EmailmanagementComponent } from './emailmanagement/emailmanagement.component';
import { EmailsdashboardComponent } from './emailsdashboard/emailsdashboard.component';
import { PublicInquiriesChartsComponent } from './emailsdashboard/public-inquiries-charts/public-inquiries-charts.component';
import { EmergencycallgroupsComponent } from './emergencycallgroups/emergencycallgroups.component';
import { EmergencymembersComponent } from './emergencymembers/emergencymembers.component';
import { EmployeesAddUpdateComponent } from './employees-manage-dash/employees-add-update/employees-add-update.component';
import { EmployeesManageDashComponent } from './employees-manage-dash/employees-manage-dash.component';
import { EmployeesUpdateManagersComponent } from './employees-manage-dash/employees-update-managers/employees-update-managers.component';
import { EmployeesComponent } from './employees/employees.component';
import { EshbozComponent } from './eshboz/eshboz.component';
import { EventsscheduleComponent } from './eventsschedule/eventsschedule.component';
import { FastCovidSendEamilComponent } from './fast-covid-send-eamil/fast-covid-send-eamil.component';
import { FastCovidTestDashboardComponent } from './fast-covid-test-dashboard/fast-covid-test-dashboard.component';
import { FastCovid19TestComponent } from './fast-covid19-test/fast-covid19-test.component';
import { AddResponseFillDialog, FillReportComponent, ShareReportsFillDialog } from './fill-report/fill-report.component';
import { DialogContentExampleDialog, FillSurveyComponent } from './fill-survey/fill-survey.component';
import { FooterComponent } from './footer/footer.component';
import { BedsoreDashboardComponent } from './form-dashboard/bedsore-dashboard/bedsore-dashboard.component';
import { BedsoreModalComponent } from './form-dashboard/bedsore-dashboard/bedsore-modal/bedsore-modal.component';
import { BoneMarrowModalComponent } from './form-dashboard/bone-marrow/bone-marrow-modal/bone-marrow-modal.component';
import { BoneMarrowComponent } from './form-dashboard/bone-marrow/bone-marrow.component';
import { AdditionalCprTablesComponent } from './form-dashboard/cpr-form/additional-cpr-tables/additional-cpr-tables.component';
import { CprFormComponent } from './form-dashboard/cpr-form/cpr-form.component';
import { FormDashboardComponent } from './form-dashboard/form-dashboard.component';
import { TrainingRequestDashboardComponent } from './form-dashboard/training-request-dashboard/training-request-dashboard.component';
import { TrainingRequestDialogComponent } from './form-dashboard/training-request-dashboard/training-request-dialog/training-request-dialog.component';
import { TrainingRequestFormComponent } from './form-dashboard/training-request-dashboard/training-request-form/training-request-form.component';
import { TumorBoardModalComponent } from './form-dashboard/tumor-board/tumor-board-modal/tumor-board-modal.component';
import { TumorBoardComponent } from './form-dashboard/tumor-board/tumor-board.component';
import { FormsansweredComponent } from './formsanswered/formsanswered.component';
import { GalitPointsReportComponent } from './galit-points-report/galit-points-report.component';
import { GlucoseComponent } from './glucose/glucose.component';
import { HeaderComponent } from './header/header.component';
import { HearingComponent } from './hearing/hearing.component';
import { BarChartComponent } from './hospital-bi-dashboard/bar-chart/bar-chart.component';
import { ChartsDialogComponent } from './hospital-bi-dashboard/charts-dialog/charts-dialog.component';
import { EshpozModalComponent } from './hospital-bi-dashboard/eshpoz-modal/eshpoz-modal.component';
import { GraphsModalComponent } from './hospital-bi-dashboard/graphs-modal/graphs-modal.component';
import { GroupedBarChartReleaseComponent } from './hospital-bi-dashboard/grouped-bar-chart-release/grouped-bar-chart-release.component';
import { GroupedBarChartComponent } from './hospital-bi-dashboard/grouped-bar-chart/grouped-bar-chart.component';
import { GroupedBarChart2Component } from './hospital-bi-dashboard/grouped-bar-chart2/grouped-bar-chart2.component';
import { HospitalBIDashboardComponent } from './hospital-bi-dashboard/hospital-bi-dashboard.component';
import { HospitalTonnageComponent } from './hospital-bi-dashboard/hospital-tonnage/hospital-tonnage.component';
import { LineChartComponent } from './hospital-bi-dashboard/line-chart/line-chart.component';
import { PieChartComponent } from './hospital-bi-dashboard/pie-chart/pie-chart.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import { DepartmentIncomeDashboardComponent } from './incomeImporter/department-income-dashboard.component';
import { InfectionDrugsComponent } from './infection-drugs/infection-drugs.component';
import { InfectionReportComponent } from './infection-report/infection-report.component';
import { InjuryReportComponent } from './injury-report/injury-report.component';
import { InvoicesComponent } from './invoices/invoices.component';
import { AddOrEditIpPointComponent } from './ip-points/add-or-edit-ip-point/add-or-edit-ip-point.component';
import { IpPointsComponent } from './ip-points/ip-points.component';
import { EditOrAddLabTestsComponent } from './lab-tests/edit-or-add-lab-tests/edit-or-add-lab-tests.component';
import { LabTestsComponent } from './lab-tests/lab-tests.component';
import { LaborComponent } from './labor/labor.component';
import { LearningRequestsDashboardComponent } from './learning-requests-dashboard/learning-requests-dashboard.component';
import { LogAllRequestsInterceptor } from './log-all-requests.interceptor';
import { HttpRequestPriorityInterceptor } from './core/http-request-priority.interceptor';
import { LoginComponent } from './login/login.component';
import { ManageClinicPriceComponent } from './manage-clinic-price/manage-clinic-price.component';
import { AddOrEditMasterHpidComponent } from './master-hpid/add-or-edit-master-hpid/add-or-edit-master-hpid.component';
import { MasterHpidComponent } from './master-hpid/master-hpid.component';
import { MaternityParticipantsComponent } from './maternity/maternity-participants/maternity-participants.component';
import { MaternityComponent } from './maternity/maternity.component';
import { MaternitypatientsComponent } from './maternitypatients/maternitypatients.component';
import { DataRowTableComponent } from './medigate-servers/data-row-table/data-row-table.component';
import { DataTableComponent } from './medigate-servers/data-table/data-table.component';
import { MedigateServersComponent } from './medigate-servers/medigate-servers.component';
import { MenuPerm } from './menu-perm';
import { MershamNComponent } from './mersham-n/mersham-n.component';
import { MershamComponent } from './mersham/mersham.component';
import { MoneyLoaderComponent } from './money-loader/money-loader.component';
import { MotherChildeLinkComponent } from './mother-childe-link/mother-childe-link.component';
import { MrbaotComponent } from './mrbaot/mrbaot.component';
import { NewBornComponent } from './new-born/new-born.component';
import { DashboardConstructionBannerComponent } from './shared/components/dashboard-construction-banner/dashboard-construction-banner.component';
import { ChartInDevelopmentComponent } from './shared/components/chart-in-development/chart-in-development.component';
import { NewbornDashboardComponent } from './newborn-dashboard/newborn-dashboard.component';
import { BirthsForCityPipe } from './newborn-dashboard/births-for-city.pipe';
import { NewHeaderComponent } from './new-header/new-header.component';
import { TreeItemDialogComponent } from './new-header/tree-item-dialog/tree-item-dialog.component';
import { TreeItemComponent } from './new-header/tree-item.component';
import { PinnedMenuBiComponent } from './new-header/pinned-menu-bi/pinned-menu-bi.component';
import { NmrIframeComponent } from './nmr-iframe/nmr-iframe.component';
import { NortonEstimateComponent } from './norton-estimate/norton-estimate.component';
import { NursesDashboardComponent, ShareReportsDialog } from './nurses-dashboard/nurses-dashboard.component';
import { BugReportComponent, NursesDepartmentManageComponent } from './nurses-department-manage/nurses-department-manage.component';
import { NursesManageDashboardComponent } from './nurses-manage-dashboard/nurses-manage-dashboard.component';
import { NursesReinforcementComponent } from './nurses-manage-dashboard/nurses-reinforcement/nurses-reinforcement.component';
import { OtherDepartmentsComponent } from './nurses-manage-dashboard/other-departments/other-departments.component';
import { DialogBoxComponent } from './nurses-manage-dashboard/system-manage/dialog-box/dialog-box.component';
import { SystemManageComponent } from './nurses-manage-dashboard/system-manage/system-manage.component';
import { NutritionSystemComponent } from './nutrition-system/nutrition-system.component';
import { OnlineAppointmentsComponent } from './online-appointments/online-appointments.component';
import { OrdersToAppointmentsComponent } from './orders-to-appointments/orders-to-appointments.component';
import { CreatePatientComponent } from './patient-stikers/create-patient/create-patient.component';
import { PatientStikersComponent } from './patient-stikers/patient-stikers.component';
import { PatientsSystemConflictsComponent } from './patients-system-conflicts/patients-system-conflicts.component';
import { AddPollComponent } from './polls/add-poll/add-poll.component';
import { PollsComponent } from './polls/polls.component';
import { ProfileDeptAssociationComponent } from './profile-dept-association/profile-dept-association.component';
import { PoriadepartsComponent } from './poriadeparts/poriadeparts.component';
import { QualityMeasuresDashboardComponent } from './quality-measures-dashboard/quality-measures-dashboard.component';
import { RehabilitationDashboardComponent } from './rehabilitation-dashboard/rehabilitation-dashboard.component';
import { RehabStatusIndicatorsComponent } from './rehabilitation-dashboard/rehab-status-indicators/rehab-status-indicators.component';
import { ReHospComponent } from './re-hosp/re-hosp.component';
import { ReportRepliesComponent } from './report-replies/report-replies.component';
import { ReportReportingComponent } from './report-reporting/report-reporting.component';
import { ResearchesComponent } from './researches/researches.component';
import { ResearchespatientsComponent } from './researchespatients/researchespatients.component';
import { ResearchesusersComponent } from './researchesusers/researchesusers.component';
import { RolesComponent } from './roles/roles.component';
import { Sarscov2Component } from './sarscov2/sarscov2.component';
import { SarsresultsComponent } from './sarsresults/sarsresults.component';
import { ScannersComponent } from './scanners/scanners.component';
import { SendsmsComponent } from './sendsms/sendsms.component';
import { SendsmsadminComponent } from './sendsmsadmin/sendsmsadmin.component';
import { AddOrEditServerComponent } from './servers-for-onnline/add-or-edit-server/add-or-edit-server.component';
import { ServersForOnnlineComponent } from './servers-for-onnline/servers-for-onnline.component';
import { ServersComponent } from './servers/servers.component';
import { SpreadsheetComponent } from './spreadsheets-dashboard/spreadsheet/spreadsheet.component';
import { SpreadsheetsDashboardComponent } from './spreadsheets-dashboard/spreadsheets-dashboard.component';
import { StaffComponent } from './staff/staff.component';
import { StatusComplaintComponent } from './status-complaint/status-complaint.component';
import { StikersComponent } from './stikers/stikers.component';
import { EditOrAddSupplierComponent } from './supplier/edit-or-add-supplier/edit-or-add-supplier.component';
import { SupplierComponent } from './supplier/supplier.component';
import { SurgeryCalendarComponent } from './surgery-calendar/surgery-calendar.component';
import { ManageSingleSurgeryComponent } from './surgery-calendar/surgery-rooms-menu/surgeries-management/manage-single-surgery/manage-single-surgery.component';
import { ShareSurgeriesPDFDialog, SummaryDialogComponent, SurgeriesManagementComponent, DepartmentPlanReturnDialogComponent, DepartmentPlanReturnReportDialogComponent } from './surgery-calendar/surgery-rooms-menu/surgeries-management/surgeries-management.component';
import { WaitingRecommendationDialogComponent } from './surgery-calendar/surgery-rooms-menu/dialogs/waiting-recommendation-dialog.component';
import { SurgeryRoomsMenuComponent } from './surgery-calendar/surgery-rooms-menu/surgery-rooms-menu.component';
import { MachinesCalendarComponent } from './machines-calendar/machines-calendar.component';
import { MachinesRoomsMenuComponent } from './machines-calendar/machines-rooms-menu/machines-rooms-menu.component';
import { MachinesRoomsDetailComponent } from './machines-calendar/machines-rooms-detail/machines-rooms-detail.component';
import { MachinesScheduleBoardComponent } from './machines-calendar/machines-schedule-board/machines-schedule-board.component';
import { AddNewNoteComponent } from './surgery-control-main/add-new-note/add-new-note.component';
import { NotesHistoryComponent } from './surgery-control-main/notes-history/notes-history.component';
import { SurgeryControlMainComponent } from './surgery-control-main/surgery-control-main.component';
import { SurgeriesUnclosedReportsComponent } from './surgery-reports/surgeries-unclosed-reports/surgeries-unclosed-reports.component';
import { SurgeryReportsComponent } from './surgery-reports/surgery-reports.component';
import { SurgeryComponent } from './surgery/surgery.component';
import { TodayDashboardComponent } from './TodayDashboardComponent/today-dashboard.component';
import { AddOrEditSwitchesComponent } from './switches/add-or-edit-switches/add-or-edit-switches.component';
import { SwitchesComponent } from './switches/switches.component';
import { UpdateformComponent } from './updateform/updateform.component';
import { UpdatesingleformComponent } from './updatesingleform/updatesingleform.component';
import { UrgentSurgeriesComponent } from './urgent-surgeries/urgent-surgeries.component';
import { VisitorsMonitoringComponent } from './visitors-monitoring/visitors-monitoring.component';
import { VisitorNameDialog, VisitorsRegistrationComponent } from './visitors-monitoring/visitors-registration/visitors-registration.component';
import { AddOrEditWagonsComponent } from './wagon/add-or-edit-wagons/add-or-edit-wagons.component';
import { WagonComponent } from './wagon/wagon.component';
import { DepartmentsWhatsappManagementComponent } from './whatsapp-departments-dashboard/departments-whatsapp-management/departments-whatsapp-management.component';
import { WhatsappDepartmentsDashboardComponent } from './whatsapp-departments-dashboard/whatsapp-departments-dashboard.component';
import { WhatsappLungCancerComponent } from './whatsapp-messages-dashboard/whatsapp-lung-cancer/whatsapp-lung-cancer.component';
import { WhatsappMessagesDashboardComponent } from './whatsapp-messages-dashboard/whatsapp-messages-dashboard.component';
import { EditOrAddWorkerCaseComponent } from './worker-cases/edit-or-add-worker-case/edit-or-add-worker-case.component';
import { WorkerCasesComponent } from './worker-cases/worker-cases.component';
//import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
registerLocaleData(localeHe);

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AiLettersDashboardComponent } from './ai-letters-dashboard/ai-letters-dashboard.component';
import { AutomationProcessDashboardComponent } from "./automationprocessdashboard/automation-process-dashboard.component";
import { CldashboardModule } from './cldashboard/cldashboard.module';
import { FolderDialogComponent } from './dashboard/folders-management/folder-dialog/folder-dialog.component';
import { FoldersManagementComponent } from './dashboard/folders-management/folders-management.component';
import { WindowsUserActionsComponent } from './dashboard/windows-user-actions/windows-user-actions.component';
import { DialogDoingComponent } from './dimot-activity-dashboard/dialog-doing/dialog-doing.component';
import { DimotActivityDashboardComponent } from './dimot-activity-dashboard/dimot-activity-dashboard.component';
import { ServiceUnitEmailListDialogComponent } from './emailsdashboard/service-unit-email-list/service-unit-email-list-dialog/service-unit-email-list-dialog.component';
import { ServiceUnitEmailListComponent } from './emailsdashboard/service-unit-email-list/service-unit-email-list.component';
import { InternDepartmentAssignmentDialogComponent } from './employees-manage-dash/medical-interns-dashboard/intern-departments-manage/intern-department-assignment-dialog/intern-department-assignment-dialog.component';
import { InternDepartmentsManageComponent } from './employees-manage-dash/medical-interns-dashboard/intern-departments-manage/intern-departments-manage.component';
import { LecturesManageDialogComponent } from './employees-manage-dash/medical-interns-dashboard/lectures-manage-dialog/lectures-manage-dialog.component';
import { MedicalInternAddUpdateComponent } from './employees-manage-dash/medical-interns-dashboard/medical-intern-add-update/medical-intern-add-update.component';
import { MedicalInternsDashboardComponent } from './employees-manage-dash/medical-interns-dashboard/medical-interns-dashboard.component';
import { MedicalInternsSmsComponent } from './employees-manage-dash/medical-interns-dashboard/medical-interns-sms/medical-interns-sms.component';
import { CommercialSupportFormDashboardComponent, DialogExampleComponent } from './form-dashboard/commercial-support-form-dashboard/commercial-support-form-dashboard.component';
import { CommercialSupportProtocolDialogComponent } from './form-dashboard/commercial-support-form-dashboard/commercial-support-protocol-dialog/commercial-support-protocol-dialog.component';
import { CommercialSupportFormDialogComponent } from './form-dashboard/commercial-support-form-dashboard/commercial-support-form-dialog/commercial-support-form-dialog.component';
import { CommercialSupportGatheringComponent } from './form-dashboard/commercial-support-form-dashboard/commercial-support-gathering/commercial-support-gathering.component';
import { CommercialSupportPresentationDialogComponent } from './form-dashboard/commercial-support-form-dashboard/commercial-support-presentation-dialog/commercial-support-presentation-dialog.component';
import { CommercialSupportResearchDialogComponent } from './form-dashboard/commercial-support-form-dashboard/commercial-support-research-dialog/commercial-support-research-dialog.component';
import { CprNewbordDashboradComponent } from './form-dashboard/cpr-newbord-dashborad/cpr-newbord-dashborad.component';
import { CprNewbornFormComponent } from './form-dashboard/cpr-newbord-dashborad/cpr-newborn-form/cpr-newborn-form.component';
import { PeopleListDialogComponent } from './form-dashboard/training-request-dashboard/training-request-dashboard.component';
import { HearingCaseNumbersDialogComponent, HearingSurveyComponent } from './hearing-survey/hearing-survey.component';
import { AppointsDashbModule } from './hospital-appoints-dashb/hospital-appoints-dashb.module';
import { HospitalCathDashbModule } from './hospital-cath-dashb/hospital-cath-dashb.module';
import { HospitalIncomeDashbComponent } from './hospital-income-dashb/hospital-income-dashb.component';
import { HospitalIncomeNBDashbComponent } from './hospital-incomenb-dashb/hospital-incomenb-dashb.component';
import { HospitalRoomTimeDashbModule } from './hospital-roomtime-dashb/hospital-roomtime-dashb.module';
import { HospitalRoomTimeNDashbModule } from './hospital-roomtimen-dashb/hospital-roomtimen-dashb.module';
import { HospitalRoomTimeRTDashbModule } from './hospital-roomtimert-dashb/hospital-roomtimert-dashb.module';
import { HospitalRoomTimeRTmDashbModule } from './hospital-roomtimert-mdashb/hospital-roomtimert-mdashb.module';
import { HospitalMachineRTmDashbModule } from './hospital-machinert-mdashb/hospital-machinert-mdashb.module';
import { InfectionControlModule } from './infection-control/infection-control.module';
import { MriScheduleComponent } from './mri-schedule';
import { DepartmentalTextureReportComponent } from './nutrition-system/departmental-texture-report/departmental-texture-report.component';
import { EmergencyRoomReportComponent } from './emergency-room-report/emergency-room-report.component';
import { ImagingPerformanceDashboardComponent } from './imaging-performance-dashboard/imaging-performance-dashboard.component';
import { MitavSummaryComponent } from './mitav-summary/mitav-summary.component';
import { HitoFormsDashboardComponent } from './hito-forms-dashboard/hito-forms-dashboard.component';
import { MedicalRecordsDashboardComponent } from './medical-records-dashboard/medical-records-dashboard.component';
import { FilterDepartsPipe } from './pipe/filter-departs.pipe';
import { SharedModule } from './shared/shared.module';
import { SurgeriesDashboradComponent } from './surgeries-dashborad-n/surgeries-dashborad.component';
import { SurgeriesCancellationsComponent } from './surgeries-dashborad-n-components/cancellations/surgeries-cancellations.component';
import { SurgeriesRevenueComponent } from './surgeries-dashborad-n-components/revenue/surgeries-revenue.component';
import { SurgeriesSubpanelMockLayoutComponent } from './surgeries-dashborad-n-components/surgeries-subpanel-mock-layout.component';
import { SurgeriesWaitTimesComponent } from './surgeries-dashborad-n-components/wait-times/surgeries-wait-times.component';
import { PciDashboradComponent } from './pci-dashborad-n/pci-dashborad.component';
import { PciRevenueComponent } from './pci-dashborad-n/components/revenue/pci-revenue.component';
import { PciExploreComponent } from './pci-dashborad-n/components/explore/pci-explore.component';
import { PciRealtimeComponent } from './pci-dashborad-n/components/realtime/pci-realtime.component';
import { WhatsappCategoriesPermissionsComponent } from './whatsapp-messages-dashboard/whatsapp-categories-permissions/whatsapp-categories-permissions.component';
import { CommercialSupportProcurementDialogComponent } from './form-dashboard/commercial-support-form-dashboard/commercial-support-procurement-dialog/commercial-support-procurement-dialog.component';
import { SecondaryDecisionStepComponent } from './form-dashboard/commercial-support-form-dashboard/secondary-decision-step/secondary-decision-step.component';
import { PermissionsReportComponent } from './employees-manage-dash/permissions-report/permissions-report.component';
import { ManagerStatusDialogComponent } from './employees-manage-dash/permissions-report/manager-status-dialog/manager-status-dialog.component';
import { PermissionsDiscrepancyDialogComponent } from './employees-manage-dash/permissions-report/permissions-discrepancy-dialog/permissions-discrepancy-dialog.component';
import { PendingAdmissionsComponent } from './pending-admissions/pending-admissions.component';
import { PendingAdmissionRecordDialogComponent } from './pending-admissions/record-dialog/pending-admission-record-dialog.component';
import { ResetPasswordHubComponent } from './dashboard/reset-password-hub/reset-password-hub.component';
import { ClinicsDashboardModule } from './ClinicsDashboard/clinics-dashboard.module';
import { DeliriumSummaryComponent } from './delirium-summary/delirium-summary.component';
import { SupplierComplianceModule } from './supplier-compliance/supplier-compliance.module';
import { EmployeeFormCompletionModule } from './employee-form-completion/employee-form-completion.module';
import { DepartmentOccupiedMitavComponent } from './department-occupied-mitav/department-occupied-mitav.component';



const maskConfig: Partial<IConfig> = {
  validation: false,
};

@NgModule({
  declarations: [
    AutomationProcessDashboardComponent,
    CasenumbersComponent,
    ScannersComponent,
    DialogContentExampleDialog,
    AppComponent,
    // DragDropModule,
    LoginComponent,
    DashboardComponent,
    HeaderComponent,
    FooterComponent,
    ChadsComponent,
    SurgeryComponent,
    MrbaotComponent,
    EshbozComponent,
    DimotComponent,
    InvoicesComponent,
    HearingComponent,
    LaborComponent,
    CoronaformComponent,
    PoriadepartsComponent,
    SurgeryReportsComponent,
    RolesComponent,
    StaffComponent,
    SendsmsComponent,
    CoronaresultformComponent,
    TreeItemComponent,
    GlucoseComponent,
    MershamComponent,
    DrugsComponent,
    CortinasComponent,
    CortinasdepartsComponent,
    CortinasnotificationComponent,
    ColonoscopyComponent,
    SendsmsadminComponent,
    CoronavaccineComponent,
    Covid19reportComponent,
    ConsultationsComponent,
    ResearchesusersComponent,
    ResearchesComponent,
    SummaryDialogComponent,
    WaitingRecommendationDialogComponent,
    DepartmentPlanReturnDialogComponent,
    DepartmentPlanReturnReportDialogComponent,
    VisitorNameDialog,
    ResearchespatientsComponent,
    Sarscov2Component,
    AddpatientcoronaformComponent,
    AddResponseFillDialog,
    SarsresultsComponent,
    MaternityComponent,
    MaternitypatientsComponent,
    EmergencycallgroupsComponent,
    EmergencymembersComponent,
    EmployeesComponent,
    FillSurveyComponent,
    FormDashboardComponent,
    UpdateformComponent,
    UpdatesingleformComponent,
    TodayDashboardComponent,
    FormsansweredComponent,
    EventsscheduleComponent,
    BugReportComponent,
    EmailsdashboardComponent,
    EmailmanagementComponent,
    StatusComplaintComponent,
    ConfirmationDialogComponent,
    CaseinvoisesComponent,
    NursesDashboardComponent,
    FillReportComponent,
    ReportRepliesComponent,
    ClinicsDashboardComponent,
    CheckpatientinsmartclosetComponent,
    DrugsnicComponent,
    ManageClinicPriceComponent,
    NursesManageDashboardComponent,
    NursesDepartmentManageComponent,
    OtherDepartmentsComponent,
    PublicInquiriesChartsComponent,
    VisitorsMonitoringComponent,
    VisitorsRegistrationComponent,
    ShareReportsDialog,
    ShareReportsFillDialog,
    ShareSurgeriesPDFDialog,
    FastCovid19TestComponent,
    FastCovidTestDashboardComponent,
    UrgentSurgeriesComponent,
    OnlineAppointmentsComponent,
    CardiologyCalendarComponent,
    AddupdateactionComponent,
    MotherChildeLinkComponent,
    DevManageComponent,
    SystemManageComponent,
    DialogBoxComponent,
    GalitPointsReportComponent,
    NmrIframeComponent,
    OrdersToAppointmentsComponent,
    EmployeesManageDashComponent,
    EmployeesAddUpdateComponent,
    NursesReinforcementComponent,
    NewHeaderComponent,
    PinnedMenuBiComponent,
    HospitalBIDashboardComponent,
    FastCovidSendEamilComponent,
    BarChartComponent,
    GroupedBarChartComponent,
    LineChartComponent,
    PieChartComponent,
    GroupedBarChart2Component,
    InfectionDrugsComponent,
    InfectionReportComponent,
    NewBornComponent,
    NewbornDashboardComponent,
    BirthsForCityPipe,
    DashboardConstructionBannerComponent,
    ChartInDevelopmentComponent,
    RehabilitationDashboardComponent,
    RehabStatusIndicatorsComponent,
    MaternityParticipantsComponent,
    CprFormComponent,
    DrugProtocolsComponent,
    MershamNComponent,
    GroupedBarChartReleaseComponent,
    ServersComponent,
    StikersComponent,
    MedigateServersComponent,
    DataTableComponent,
    DataRowTableComponent,
    GraphsModalComponent,
    SurgeryControlMainComponent,
    AddNewNoteComponent,
    AdditionalCprTablesComponent,
    ChartsDialogComponent,
    NotesHistoryComponent,
    EshpozModalComponent,
    ServersForOnnlineComponent,
    AddOrEditServerComponent,
    IpPointsComponent,
    AddOrEditIpPointComponent,
    TumorBoardComponent,
    TumorBoardModalComponent,
    MasterHpidComponent,
    AddOrEditMasterHpidComponent,
    CablesComponent,
    AddOrEditCablesComponent,
    SurgeryCalendarComponent,
    MachinesCalendarComponent,
    MachinesRoomsMenuComponent,
    MachinesRoomsDetailComponent,
    MachinesScheduleBoardComponent,
    SurgeryRoomsMenuComponent,
    SurgeriesManagementComponent,
    ManageSingleSurgeryComponent,
    FollowUpComponent,
    WagonComponent,
    AddOrEditWagonsComponent,
    QualityMeasuresDashboardComponent,
    BoneMarrowComponent,
    BoneMarrowModalComponent,
    WhatsappMessagesDashboardComponent,
    NutritionSystemComponent,
    ClinicsRequestsComponent,
    ClinicsRequestsDialogComponent,
    ClinicsPatientRequestsDialogComponent,
    SwitchesComponent,
    AddOrEditSwitchesComponent,
    HrDashboardComponent,
    PatientStikersComponent,
    NortonEstimateComponent,
    CAMEstimateComponent,
    DialysisReportComponent,
    DialysisReportPatientsComponent,
    CreatePatientComponent,
    SurgeriesUnclosedReportsComponent,
    InjuryReportComponent,
    CreatePatientComponent,
    WhatsappDepartmentsDashboardComponent,
    PollsComponent,
    ProfileDeptAssociationComponent,
    AddPollComponent,
    CathReportComponent,
    DepartmentIncomeDashboardComponent,
    MoneyLoaderComponent,
    PatientsSystemConflictsComponent,
    BTirmComponent,
    ReportReportingComponent,
    EmployeesUpdateManagersComponent,
    WorkerCasesComponent,
    EditOrAddWorkerCaseComponent,
    ReHospComponent,
    EmployeesUpdateManagersComponent,
    BedsoreDashboardComponent,
    BedsoreModalComponent,
    EditOrAddWorkerCaseDialogComponent,
    AuthorizedComponent,
    AddEditAuthorizedComponent,
    SupplierComponent,
    EditOrAddSupplierComponent,
    TreeItemDialogComponent,
    LabTestsComponent,
    EditOrAddLabTestsComponent,
    SpreadsheetComponent,
    SpreadsheetsDashboardComponent,
    HospitalTonnageComponent,
    FolderTreeComponent,
    FeedLineComponent,
    ClinicActivityDashboardComponent,
    CliniDataComponent,
    DepartmentsWhatsappManagementComponent,
    TrainingRequestDashboardComponent,
    TrainingRequestFormComponent,
    TrainingRequestDialogComponent,
    WhatsappLungCancerComponent,
    ShortcutsManagementComponent,
    ShortcutFormDialogComponent,
    NamerUserActionsComponent,
    LearningRequestsDashboardComponent,
    CprNewbordDashboradComponent,
    CprNewbornFormComponent,
    CprNewbordDashboradComponent,
    CprNewbornFormComponent,
    CommercialSupportFormDashboardComponent,
    PeopleListDialogComponent,
    DialogExampleComponent,
    CommercialSupportProtocolDialogComponent,
    CommercialSupportFormDialogComponent,
    CommercialSupportResearchDialogComponent,
    CommercialSupportPresentationDialogComponent,
    WhatsappCategoriesPermissionsComponent,
    ServiceUnitEmailListComponent,
    ServiceUnitEmailListDialogComponent,
    CommercialSupportGatheringComponent,
    HospitalIncomeDashbComponent,
    HospitalIncomeNBDashbComponent,    
    FilterDepartsPipe,
    FoldersManagementComponent,
    FolderDialogComponent,
    DimotActivityDashboardComponent,
    SurgeriesDashboradComponent,
    SurgeriesWaitTimesComponent,
    SurgeriesCancellationsComponent,
    SurgeriesRevenueComponent,
    SurgeriesSubpanelMockLayoutComponent,
    PciDashboradComponent,
    PciRevenueComponent,
    PciExploreComponent,
    PciRealtimeComponent,
    DialogDoingComponent,
    HearingSurveyComponent,
    DepartmentOccupiedMitavComponent,
    HearingCaseNumbersDialogComponent,
    DepartmentalTextureReportComponent,
    WindowsUserActionsComponent,
    AiLettersDashboardComponent,
    MriScheduleComponent,
    EmergencyRoomReportComponent,
    ImagingPerformanceDashboardComponent,
    MitavSummaryComponent,
    DeliriumSummaryComponent,
    HitoFormsDashboardComponent,
    MedicalRecordsDashboardComponent,
    MedicalInternsDashboardComponent,
    MedicalInternAddUpdateComponent,
    InternDepartmentsManageComponent,
    InternDepartmentAssignmentDialogComponent,
    LecturesManageDialogComponent,
    MedicalInternsSmsComponent,
    CommercialSupportProcurementDialogComponent,
    SecondaryDecisionStepComponent,
    PermissionsReportComponent,
    ManagerStatusDialogComponent,
    PermissionsDiscrepancyDialogComponent,
    PendingAdmissionsComponent,
    PendingAdmissionRecordDialogComponent,
    ResetPasswordHubComponent,
    //HospitalIncomeDashbComponent,
  ],
  imports: [
    SupplierComplianceModule,
    EmployeeFormCompletionModule,
    InfectionControlModule,
    ClinicsDashboardModule,
    MatIconModule,
    SpreadsheetAllModule,
    AngularEditorModule,
    JpTimeMaskModule,
    NgxBarcodeModule,
    AngularDualListBoxModule,
    MatTableExporterModule,
    AngularDualListBoxModule,
    BrowserModule,
    MatButtonToggleModule,
    BrowserAnimationsModule,
    RouterModule,
    AppRoutingModule,
    MatSidenavModule,
    MatButtonModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    FlatpickrModule.forRoot(),
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
    //NgbModal,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    NgxBarCodePutModule,
    GoogleChartsModule,
    NgxMatNativeDateModule,
    MatMomentDateModule,
    NgxMaterialTimepickerModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    MatBadgeModule,
    NgCircleProgressModule.forRoot({
      // // set defaults here
      // radius: 30,
      // outerStrokeWidth: 16,
      // innerStrokeWidth: 8,
      // outerStrokeColor: "#78C000d9",
      // innerStrokeColor: "#C7E596",
      // subtitleColor: "#C7E596",
      // unitsColor: "#C7E596",
      // titleColor: "#C7E596",
      // animationDuration: 300,
      // lazy : false

    }),
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyBMYu4gJHWl09_DEpL08qmrJXv6s-kCfiI'
    }),
    NgxMaskModule.forRoot(maskConfig),
    NgbModule,
    MatTabsModule,
    MatDialogModule,
    MatSelectModule,
    BrowserModule,
    HttpClientModule,
    MatTooltipModule,
    MatTreeModule,
    DataTablesModule,
    MatStepperModule,
    MatChipsModule,
    // ZXingScannerModule,
    BrowserAnimationsModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatMenuModule,
    MatSortModule,
    MatTableModule,
    CustomMaterialModule,
    MatButtonModule,
    GoogleChartsModule,
    MatDatepickerModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatNativeDateModule,
    MatInputModule,
    MatSnackBarModule,
    FormsModule,
    AppRoutingModule,
    MatCheckboxModule,
    MatListModule,
    MatRadioModule,
    ReactiveFormsModule,
    CalendarModule.forRoot({ provide: DateAdapter, useFactory: adapterFactory }),
    //HospitalCathDashbModule,
    AppRoutingModule,
    SharedModule,
    CldashboardModule,
    MatProgressSpinnerModule,
    HospitalRoomTimeDashbModule,
    HospitalRoomTimeNDashbModule,
    HospitalRoomTimeRTDashbModule,
    HospitalRoomTimeRTmDashbModule,
    HospitalMachineRTmDashbModule,
    AppointsDashbModule
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'he-IL' }
    , { provide: MAT_DATE_LOCALE, useValue: 'he-IL' }
    , DatePipe
    , ConfirmationDialogService
    , MenuPerm
    , NgbActiveModal
   // , DashboardService
    , { provide: GraphsModalComponent, useClass: LogAllRequestsInterceptor, multi: true }
    , { provide: HTTP_INTERCEPTORS, useClass: HttpRequestPriorityInterceptor, multi: true }
    , { provide: HTTP_INTERCEPTORS, useClass: LogAllRequestsInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
  exports: [
    MatBadgeModule,
    FormsModule,
    ReactiveFormsModule,
    HearingSurveyComponent,
  ]
})
export class AppModule { }