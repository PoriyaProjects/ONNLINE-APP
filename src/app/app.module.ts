import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Injectable, NgModule } from '@angular/core';
import { CustomMaterialModule } from './core/material.module';
import { AppRoutingModule } from './core/app.routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { NgbModule, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
// import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatBadgeModule } from '@angular/material/badge';
import { MatInputModule } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTreeModule } from '@angular/material/tree';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { ChadsComponent } from './chads/chads.component';
import { MatListModule } from '@angular/material/list';
import { DataTablesModule } from 'angular-datatables';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { SurgeryComponent } from './surgery/surgery.component';
import { MrbaotComponent } from './mrbaot/mrbaot.component';
import { EshbozComponent } from './eshboz/eshboz.component';
import { DimotComponent } from './dimot/dimot.component';
import { InvoicesComponent } from './invoices/invoices.component';
import { NgCircleProgressModule } from 'ng-circle-progress';
import { HearingComponent } from './hearing/hearing.component';
import { LaborComponent } from './labor/labor.component';
import { AgmCoreModule } from '@agm/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CoronaformComponent } from './coronaform/coronaform.component';
import { NgxMaskModule, IConfig } from 'ngx-mask';
import { PoriadepartsComponent } from './poriadeparts/poriadeparts.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RolesComponent } from './roles/roles.component';
import { MatMenuModule } from '@angular/material/menu';
import { StaffComponent } from './staff/staff.component';
import { SendsmsComponent } from './sendsms/sendsms.component';
import { CoronaresultformComponent } from './coronaresultform/coronaresultform.component';
import { GlucoseComponent } from './glucose/glucose.component';
import { MershamComponent } from './mersham/mersham.component';
import { DrugsComponent } from './drugs/drugs.component';
import { CortinasComponent } from './cortinas/cortinas.component';
import { CortinasdepartsComponent } from './cortinasdeparts/cortinasdeparts.component';
import { CortinasnotificationComponent } from './cortinasnotification/cortinasnotification.component';
import { ColonoscopyComponent } from './colonoscopy/colonoscopy.component';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule, NgxMatNativeDateModule } from '@angular-material-components/datetime-picker';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { MatMomentDateModule } from "@angular/material-moment-adapter";
import { SendsmsadminComponent } from './sendsmsadmin/sendsmsadmin.component';
import { CoronavaccineComponent } from './coronavaccine/coronavaccine.component';
import { Covid19reportComponent } from './covid19report/covid19report.component';
import { ConsultationsComponent } from './consultations/consultations.component';
import { ResearchesusersComponent } from './researchesusers/researchesusers.component';
import { ResearchesComponent } from './researches/researches.component';
import { ResearchespatientsComponent } from './researchespatients/researchespatients.component';
import { Sarscov2Component } from './sarscov2/sarscov2.component';
import { AddpatientcoronaformComponent } from './addpatientcoronaform/addpatientcoronaform.component';
import { SarsresultsComponent } from './sarsresults/sarsresults.component';
import { MaternityComponent } from './maternity/maternity.component';
import { MaternitypatientsComponent } from './maternitypatients/maternitypatients.component';
import { EmergencycallgroupsComponent } from './emergencycallgroups/emergencycallgroups.component';
import { EmergencymembersComponent } from './emergencymembers/emergencymembers.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { EmployeesComponent } from './employees/employees.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FillSurveyComponent, DialogContentExampleDialog } from './fill-survey/fill-survey.component';
import { FormDashboardComponent } from './form-dashboard/form-dashboard.component';
import { UpdateformComponent } from './updateform/updateform.component';
import { UpdatesingleformComponent } from './updatesingleform/updatesingleform.component';
import { FormsansweredComponent } from './formsanswered/formsanswered.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventsscheduleComponent } from './eventsschedule/eventsschedule.component';
import { EmailsdashboardComponent } from './emailsdashboard/emailsdashboard.component';
import { EmailmanagementComponent } from './emailmanagement/emailmanagement.component';
import { DatePipe, registerLocaleData } from '@angular/common';
import { StatusComplaintComponent } from './status-complaint/status-complaint.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { ConfirmationDialogService } from './confirmation-dialog/confirmation-dialog.service';
import { CaseinvoisesComponent } from './caseinvoises/caseinvoises.component';
import { NursesDashboardComponent } from './nurses-dashboard/nurses-dashboard.component';
import { FillReportComponent } from './fill-report/fill-report.component';
import { ReportRepliesComponent } from './report-replies/report-replies.component';
import { ManageClinicPriceComponent } from './manage-clinic-price/manage-clinic-price.component';
import { NursesManageDashboardComponent } from './nurses-manage-dashboard/nurses-manage-dashboard.component';
import { NursesDepartmentManageComponent } from './nurses-department-manage/nurses-department-manage.component';
import { OtherDepartmentsComponent } from './nurses-manage-dashboard/other-departments/other-departments.component';
import { ScannersComponent } from './scanners/scanners.component';
import { CasenumbersComponent } from './casenumbers/casenumbers.component';
import { ClinicsDashboardComponent } from './clinics-dashboard/clinics-dashboard.component';
import { CheckpatientinsmartclosetComponent } from './checkpatientinsmartcloset/checkpatientinsmartcloset.component';
import { DrugsnicComponent } from './drugsnic/drugsnic.component';
import { NgxBarCodePutModule } from 'ngx-barcodeput';
import { GoogleChartsModule } from 'angular-google-charts';
import { PublicInquiriesChartsComponent } from './emailsdashboard/public-inquiries-charts/public-inquiries-charts.component';
import { VisitorsMonitoringComponent } from './visitors-monitoring/visitors-monitoring.component';
import { VisitorsRegistrationComponent } from './visitors-monitoring/visitors-registration/visitors-registration.component';
import { VisitorNameDialog } from './visitors-monitoring/visitors-registration/visitors-registration.component';
import { ShareReportsDialog } from './nurses-dashboard/nurses-dashboard.component';
import { ShareReportsFillDialog } from './fill-report/fill-report.component';
import { FastCovid19TestComponent } from './fast-covid19-test/fast-covid19-test.component';
import { FastCovidTestDashboardComponent } from './fast-covid-test-dashboard/fast-covid-test-dashboard.component';
import { AddResponseFillDialog } from './fill-report/fill-report.component';
import { UrgentSurgeriesComponent } from './urgent-surgeries/urgent-surgeries.component';
import { OnlineAppointmentsComponent } from './online-appointments/online-appointments.component';
import { TreeItemComponent } from './new-header/tree-item.component';
import localeHe from '@angular/common/locales/he';
//import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
registerLocaleData(localeHe);
import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { FlatpickrModule } from 'angularx-flatpickr';
import { CardiologyCalendarComponent } from './cardiology-calendar/cardiology-calendar.component';
import { AddupdateactionComponent } from './cardiology-calendar/addupdateaction/addupdateaction.component';
import { MotherChildeLinkComponent } from './mother-childe-link/mother-childe-link.component';
import { DevManageComponent } from './dev-manage/dev-manage.component';
import { SystemManageComponent } from './nurses-manage-dashboard/system-manage/system-manage.component';
import { DialogBoxComponent } from './nurses-manage-dashboard/system-manage/dialog-box/dialog-box.component';
import { GalitPointsReportComponent } from './galit-points-report/galit-points-report.component';
import { BugReportComponent } from './nurses-department-manage/nurses-department-manage.component';
import { NmrIframeComponent } from './nmr-iframe/nmr-iframe.component';
import { OrdersToAppointmentsComponent } from './orders-to-appointments/orders-to-appointments.component';
import { EmployeesManageDashComponent } from './employees-manage-dash/employees-manage-dash.component';
import { EmployeesAddUpdateComponent } from './employees-manage-dash/employees-add-update/employees-add-update.component';
import { NursesReinforcementComponent } from './nurses-manage-dashboard/nurses-reinforcement/nurses-reinforcement.component';
import { NewHeaderComponent } from './new-header/new-header.component';
import { HospitalBIDashboardComponent } from './hospital-bi-dashboard/hospital-bi-dashboard.component';
import { RouterModule } from '@angular/router';
import { MenuPerm } from './menu-perm';
import { FastCovidSendEamilComponent } from './fast-covid-send-eamil/fast-covid-send-eamil.component';
import { BarChartComponent } from './hospital-bi-dashboard/bar-chart/bar-chart.component';
import { GroupedBarChartComponent } from './hospital-bi-dashboard/grouped-bar-chart/grouped-bar-chart.component';
import { LineChartComponent } from './hospital-bi-dashboard/line-chart/line-chart.component';
import { PieChartComponent } from './hospital-bi-dashboard/pie-chart/pie-chart.component';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { GroupedBarChart2Component } from './hospital-bi-dashboard/grouped-bar-chart2/grouped-bar-chart2.component';
import { InfectionDrugsComponent } from './infection-drugs/infection-drugs.component';
import { AngularDualListBoxModule } from 'angular-dual-listbox';
import { InfectionReportComponent } from './infection-report/infection-report.component';
import { NewBornComponent } from './new-born/new-born.component';
import { MaternityParticipantsComponent } from './maternity/maternity-participants/maternity-participants.component';
import { CprFormComponent } from './form-dashboard/cpr-form/cpr-form.component';
import { MatTableExporterModule } from 'mat-table-exporter';
import { DrugProtocolsComponent } from './drug-protocols/drug-protocols.component';
import { MershamNComponent } from './mersham-n/mersham-n.component';
import { LogAllRequestsInterceptor } from './log-all-requests.interceptor';
import { GroupedBarChartReleaseComponent } from './hospital-bi-dashboard/grouped-bar-chart-release/grouped-bar-chart-release.component';
import { ServersComponent } from './servers/servers.component';
import { JpTimeMaskModule } from '@julianobrasil/timemask';
import { StikersComponent } from './stikers/stikers.component';
import { NgxBarcodeModule } from 'ngx-barcode';
import { MedigateServersComponent } from './medigate-servers/medigate-servers.component';
import { DataTableComponent } from './medigate-servers/data-table/data-table.component';
import { DataRowTableComponent } from './medigate-servers/data-row-table/data-row-table.component';
import { GraphsModalComponent } from './hospital-bi-dashboard/graphs-modal/graphs-modal.component';
import { SurgeryControlMainComponent } from './surgery-control-main/surgery-control-main.component';
import { AddNewNoteComponent } from './surgery-control-main/add-new-note/add-new-note.component';
import { AdditionalCprTablesComponent } from './form-dashboard/cpr-form/additional-cpr-tables/additional-cpr-tables.component';
import { ChartsDialogComponent } from './hospital-bi-dashboard/charts-dialog/charts-dialog.component';
import { HospitalBiService } from './hospital-bi-dashboard/hospital-bi.service';
import { NotesHistoryComponent } from './surgery-control-main/notes-history/notes-history.component';
import { EshpozModalComponent } from './hospital-bi-dashboard/eshpoz-modal/eshpoz-modal.component';
import { ServersForOnnlineComponent } from './servers-for-onnline/servers-for-onnline.component';
import { AddOrEditServerComponent } from './servers-for-onnline/add-or-edit-server/add-or-edit-server.component';
import { IpPointsComponent } from './ip-points/ip-points.component';
import { AddOrEditIpPointComponent } from './ip-points/add-or-edit-ip-point/add-or-edit-ip-point.component';
import { TumorBoardComponent } from './form-dashboard/tumor-board/tumor-board.component';
import { TumorBoardModalComponent } from './form-dashboard/tumor-board/tumor-board-modal/tumor-board-modal.component';
import { MasterHpidComponent } from './master-hpid/master-hpid.component';
import { AddOrEditMasterHpidComponent } from './master-hpid/add-or-edit-master-hpid/add-or-edit-master-hpid.component';
import { CablesComponent } from './cables/cables.component';
import { AddOrEditCablesComponent } from './cables/add-or-edit-cables/add-or-edit-cables.component';
import { SurgeryCalendarComponent } from './surgery-calendar/surgery-calendar.component';
import { SurgeryRoomsMenuComponent } from './surgery-calendar/surgery-rooms-menu/surgery-rooms-menu.component';
import { SurgeriesManagementComponent } from './surgery-calendar/surgery-rooms-menu/surgeries-management/surgeries-management.component';
import { ManageSingleSurgeryComponent } from './surgery-calendar/surgery-rooms-menu/surgeries-management/manage-single-surgery/manage-single-surgery.component';
import { FollowUpComponent } from './consultations/follow-up/follow-up.component';
import { SurgeryReportsComponent } from './surgery-reports/surgery-reports.component';
import { WagonComponent } from './wagon/wagon.component';
import { AddOrEditWagonsComponent } from './wagon/add-or-edit-wagons/add-or-edit-wagons.component';
import { SummaryDialogComponent } from './surgery-calendar/surgery-rooms-menu/surgeries-management/surgeries-management.component';
import { QualityMeasuresDashboardComponent } from './quality-measures-dashboard/quality-measures-dashboard.component';
import { BoneMarrowComponent } from './form-dashboard/bone-marrow/bone-marrow.component';
import { BoneMarrowModalComponent } from './form-dashboard/bone-marrow/bone-marrow-modal/bone-marrow-modal.component';
import { WhatsappMessagesDashboardComponent } from './whatsapp-messages-dashboard/whatsapp-messages-dashboard.component';
import { NutritionSystemComponent } from './nutrition-system/nutrition-system.component';
import { ClinicsRequestsComponent } from './clinics-requests/clinics-requests.component';
import { ClinicsRequestsDialogComponent } from './clinics-requests/clinics-requests-dialog/clinics-requests-dialog.component';
import { ClinicsPatientRequestsDialogComponent } from './clinics-requests/clinics-patient-requests-dialog/clinics-patient-requests-dialog.component';
import { SwitchesComponent } from './switches/switches.component';
import { AddOrEditSwitchesComponent } from './switches/add-or-edit-switches/add-or-edit-switches.component';
import { HrDashboardComponent } from './hr-dashboard/hr-dashboard.component';
import { PatientStikersComponent } from './patient-stikers/patient-stikers.component';
import { NortonEstimateComponent } from './norton-estimate/norton-estimate.component';
import { CAMEstimateComponent } from './cam-estimate/cam-estimate.component';
import { DialysisReportComponent } from './dialysis-report/dialysis-report.component';
import { CreatePatientComponent } from './patient-stikers/create-patient/create-patient.component';
import { SurgeriesUnclosedReportsComponent } from './surgery-reports/surgeries-unclosed-reports/surgeries-unclosed-reports.component'
import { InjuryReportComponent } from './injury-report/injury-report.component';
import { WhatsappDepartmentsDashboardComponent } from './whatsapp-departments-dashboard/whatsapp-departments-dashboard.component';
import { PollsComponent } from './polls/polls.component';
import { AddPollComponent } from './polls/add-poll/add-poll.component';
import { CathReportComponent } from './cath-report/cath-report.component';
import { PatientsSystemConflictsComponent } from './patients-system-conflicts/patients-system-conflicts.component';
import { BTirmComponent } from './b-tirm/b-tirm.component';
import { ReportReportingComponent } from './report-reporting/report-reporting.component';
import { ReHospComponent } from './re-hosp/re-hosp.component';
import { EmployeesUpdateManagersComponent } from './employees-manage-dash/employees-update-managers/employees-update-managers.component';
import { WorkerCasesComponent } from './worker-cases/worker-cases.component';
import { EditOrAddWorkerCaseComponent } from './worker-cases/edit-or-add-worker-case/edit-or-add-worker-case.component';
import { BedsoreDashboardComponent } from './form-dashboard/bedsore-dashboard/bedsore-dashboard.component';
import { BedsoreModalComponent } from './form-dashboard/bedsore-dashboard/bedsore-modal/bedsore-modal.component';
import { EditOrAddWorkerCaseDialogComponent } from './edit-or-add-worker-case-dialog/edit-or-add-worker-case-dialog.component';
import { AuthorizedComponent } from './authorized/authorized.component';
import { AddEditAuthorizedComponent } from './authorized/add-edit-authorized/add-edit-authorized.component';
import { SupplierComponent } from './supplier/supplier.component';
import { EditOrAddSupplierComponent } from './supplier/edit-or-add-supplier/edit-or-add-supplier.component';
import { TreeItemDialogComponent } from './new-header/tree-item-dialog/tree-item-dialog.component';
import { AngularEditorModule } from '@kolkov/angular-editor';


const maskConfig: Partial<IConfig> = {
  validation: false,
};

@NgModule({
  declarations: [
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
    CreatePatientComponent,
    SurgeriesUnclosedReportsComponent,
    InjuryReportComponent,
    CreatePatientComponent,
    WhatsappDepartmentsDashboardComponent,
    PollsComponent,
    AddPollComponent,
    CathReportComponent,
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
    TreeItemDialogComponent
  ],
  imports: [    
    
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
    CalendarModule.forRoot({ provide: DateAdapter, useFactory: adapterFactory })
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' }
    , DatePipe
    , ConfirmationDialogService
    , MenuPerm
    , NgbActiveModal
    , { provide: GraphsModalComponent, useClass: LogAllRequestsInterceptor, multi: true }
    , { provide: HTTP_INTERCEPTORS, useClass: LogAllRequestsInterceptor, multi: true }
  ],
  bootstrap: [AppComponent],
  exports: [
    MatBadgeModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class AppModule { }
