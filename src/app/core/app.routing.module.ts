import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddpatientcoronaformComponent } from "../addpatientcoronaform/addpatientcoronaform.component";
import { AiLettersDashboardComponent } from "../ai-letters-dashboard/ai-letters-dashboard.component";
import { AuthorizedComponent } from '../authorized/authorized.component';
import { AutomationProcessDashboardComponent } from "../automationprocessdashboard/automation-process-dashboard.component";
import { BTirmComponent } from '../b-tirm/b-tirm.component';
import { CablesComponent } from '../cables/cables.component';
import { CAMEstimateComponent } from '../cam-estimate/cam-estimate.component';
import { AddupdateactionComponent } from "../cardiology-calendar/addupdateaction/addupdateaction.component";
import { CardiologyCalendarComponent } from "../cardiology-calendar/cardiology-calendar.component";
import { CaseinvoisesComponent } from '../caseinvoises/caseinvoises.component';
import { CasenumbersComponent } from "../casenumbers/casenumbers.component";
import { CathReportComponent } from '../cath-report/cath-report.component';
import { ChadsComponent } from '../chads/chads.component';
import { CheckpatientinsmartclosetComponent } from '../checkpatientinsmartcloset/checkpatientinsmartcloset.component';
import { FullPageDashboardComponent } from '../cldashboard/pages/full-page-dashboard.component';
import { ClinicActivityDashboardComponent } from '../clinic-activity-dashboard/clinic-activity-dashboard.component';
import { ClinicsDashboardComponent } from '../clinics-dashboard/clinics-dashboard.component';
import { ClinicsRequestsComponent } from "../clinics-requests/clinics-requests.component";
import { ColonoscopyComponent } from '../colonoscopy/colonoscopy.component';
import { ConsultationsComponent } from "../consultations/consultations.component";
import { FollowUpComponent } from '../consultations/follow-up/follow-up.component';
import { CoronaformComponent } from '../coronaform/coronaform.component';
import { CoronaresultformComponent } from '../coronaresultform/coronaresultform.component';
import { CoronavaccineComponent } from '../coronavaccine/coronavaccine.component';
import { CortinasComponent } from '../cortinas/cortinas.component';
import { CortinasdepartsComponent } from '../cortinasdeparts/cortinasdeparts.component';
import { CortinasnotificationComponent } from '../cortinasnotification/cortinasnotification.component';
import { Covid19reportComponent } from '../covid19report/covid19report.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { FolderTreeComponent } from '../dashboard/folder-tree/folder-tree.component';
import { FolderDialogComponent } from '../dashboard/folders-management/folder-dialog/folder-dialog.component';
import { FoldersManagementComponent } from '../dashboard/folders-management/folders-management.component';
import { NamerUserActionsComponent } from '../dashboard/namer-user-actions/namer-user-actions.component';
import { ShortcutFormDialogComponent } from '../dashboard/shortcuts-management/shortcut-form-dialog/shortcut-form-dialog.component';
import { ShortcutsManagementComponent } from '../dashboard/shortcuts-management/shortcuts-management.component';
import { WindowsUserActionsComponent } from "../dashboard/windows-user-actions/windows-user-actions.component";
import { DevManageComponent } from "../dev-manage/dev-manage.component";
import { DialysisReportComponent } from '../dialysis-report/dialysis-report.component';
import { DialysisReportPatientsComponent } from '../dialysis-report/dialysis-report-patients/dialysis-report-patients.component';
import { DimotActivityDashboardComponent } from '../dimot-activity-dashboard/dimot-activity-dashboard.component';
import { DimotComponent } from '../dimot/dimot.component';
import { DrugProtocolsComponent } from '../drug-protocols/drug-protocols.component';
import { DrugsComponent } from '../drugs/drugs.component';
import { DrugsnicComponent } from '../drugsnic/drugsnic.component';
import { EmailmanagementComponent } from '../emailmanagement/emailmanagement.component';
import { EmailsdashboardComponent } from '../emailsdashboard/emailsdashboard.component';
import { PublicInquiriesChartsComponent } from "../emailsdashboard/public-inquiries-charts/public-inquiries-charts.component";
import { ServiceUnitEmailListDialogComponent } from '../emailsdashboard/service-unit-email-list/service-unit-email-list-dialog/service-unit-email-list-dialog.component';
import { ServiceUnitEmailListComponent } from '../emailsdashboard/service-unit-email-list/service-unit-email-list.component';
import { EmergencycallgroupsComponent } from "../emergencycallgroups/emergencycallgroups.component";
import { EmergencymembersComponent } from "../emergencymembers/emergencymembers.component";
import { EmployeesAddUpdateComponent } from '../employees-manage-dash/employees-add-update/employees-add-update.component';
import { EmployeesManageDashComponent } from '../employees-manage-dash/employees-manage-dash.component';
import { EmployeesUpdateManagersComponent } from '../employees-manage-dash/employees-update-managers/employees-update-managers.component';
import { InternDepartmentAssignmentDialogComponent } from '../employees-manage-dash/medical-interns-dashboard/intern-departments-manage/intern-department-assignment-dialog/intern-department-assignment-dialog.component';
import { InternDepartmentsManageComponent } from '../employees-manage-dash/medical-interns-dashboard/intern-departments-manage/intern-departments-manage.component';
import { LecturesManageDialogComponent } from '../employees-manage-dash/medical-interns-dashboard/lectures-manage-dialog/lectures-manage-dialog.component';
import { MedicalInternAddUpdateComponent } from '../employees-manage-dash/medical-interns-dashboard/medical-intern-add-update/medical-intern-add-update.component';
import { MedicalInternsDashboardComponent } from '../employees-manage-dash/medical-interns-dashboard/medical-interns-dashboard.component';
import { MedicalInternsSmsComponent } from '../employees-manage-dash/medical-interns-dashboard/medical-interns-sms/medical-interns-sms.component';
import { EmployeesComponent } from "../employees/employees.component";
import { EshbozComponent } from '../eshboz/eshboz.component';
import { EventsscheduleComponent } from '../eventsschedule/eventsschedule.component';
import { FastCovidTestDashboardComponent } from "../fast-covid-test-dashboard/fast-covid-test-dashboard.component";
import { FastCovid19TestComponent } from "../fast-covid19-test/fast-covid19-test.component";
import { FillReportComponent } from '../fill-report/fill-report.component';
import { FillSurveyComponent } from "../fill-survey/fill-survey.component";
import { BedsoreDashboardComponent } from '../form-dashboard/bedsore-dashboard/bedsore-dashboard.component';
import { BoneMarrowModalComponent } from '../form-dashboard/bone-marrow/bone-marrow-modal/bone-marrow-modal.component';
import { BoneMarrowComponent } from '../form-dashboard/bone-marrow/bone-marrow.component';
import { CommercialSupportFormDashboardComponent } from '../form-dashboard/commercial-support-form-dashboard/commercial-support-form-dashboard.component';
import { CommercialSupportFormDialogComponent } from '../form-dashboard/commercial-support-form-dashboard/commercial-support-form-dialog/commercial-support-form-dialog.component';
import { CommercialSupportGatheringComponent } from '../form-dashboard/commercial-support-form-dashboard/commercial-support-gathering/commercial-support-gathering.component';
import { CommercialSupportResearchDialogComponent } from '../form-dashboard/commercial-support-form-dashboard/commercial-support-research-dialog/commercial-support-research-dialog.component';
import { CommercialSupportProcurementDialogComponent } from '../form-dashboard/commercial-support-form-dashboard/commercial-support-procurement-dialog/commercial-support-procurement-dialog.component';
import { AdditionalCprTablesComponent } from '../form-dashboard/cpr-form/additional-cpr-tables/additional-cpr-tables.component';
import { CprFormComponent } from "../form-dashboard/cpr-form/cpr-form.component";
import { CprNewbordDashboradComponent } from '../form-dashboard/cpr-newbord-dashborad/cpr-newbord-dashborad.component';
import { CprNewbornFormComponent } from '../form-dashboard/cpr-newbord-dashborad/cpr-newborn-form/cpr-newborn-form.component';
import { FormDashboardComponent } from '../form-dashboard/form-dashboard.component';
import { TrainingRequestDashboardComponent } from '../form-dashboard/training-request-dashboard/training-request-dashboard.component';
import { TrainingRequestDialogComponent } from '../form-dashboard/training-request-dashboard/training-request-dialog/training-request-dialog.component';
import { TrainingRequestFormComponent } from '../form-dashboard/training-request-dashboard/training-request-form/training-request-form.component';
import { TumorBoardModalComponent } from "../form-dashboard/tumor-board/tumor-board-modal/tumor-board-modal.component";
import { TumorBoardComponent } from "../form-dashboard/tumor-board/tumor-board.component";
import { FormsansweredComponent } from '../formsanswered/formsanswered.component';
import { GalitPointsReportComponent } from "../galit-points-report/galit-points-report.component";
import { GlucoseComponent } from '../glucose/glucose.component';
import { HearingSurveyComponent } from '../hearing-survey/hearing-survey.component';
import { HearingComponent } from '../hearing/hearing.component';
import { AppointsDashboardComponent } from '../hospital-appoints-dashb/google-charts/google-charts.component';
import { AppointsCLDashboardComponent } from '../hospital-appointscl-dashb/google-charts/google-charts.component';
import { EshpozModalComponent } from '../hospital-bi-dashboard/eshpoz-modal/eshpoz-modal.component';
import { GraphsModalComponent } from '../hospital-bi-dashboard/graphs-modal/graphs-modal.component';
import { HospitalBIDashboardComponent } from '../hospital-bi-dashboard/hospital-bi-dashboard.component';
import { HospitalTonnageComponent } from '../hospital-bi-dashboard/hospital-tonnage/hospital-tonnage.component';
import { GoogleChartsComponent } from '../hospital-cath-dashb/google-charts/google-charts.component';
import { GoogleChartsIncomeComponent } from '../hospital-income-dashb/google-charts/google-charts.component';
import { HospitalIncomeDashbComponent } from '../hospital-income-dashb/hospital-income-dashb.component';
import { GoogleChartsIncomeNBComponent } from '../hospital-incomenb-dashb/google-charts/google-charts.component';
import { RoomTimeDashboardComponent } from '../hospital-roomtime-dashb/google-charts/google-charts.component';
import { RoomTimeNDashboardComponent } from '../hospital-roomtimen-dashb/google-charts/google-charts.component';
import { RoomTimeRTDashboardComponent } from '../hospital-roomtimert-dashb/google-charts/google-charts.component';
import { RoomTimeRTmDashboardComponent } from '../hospital-roomtimert-mdashb/google-charts/google-charts.component';
import { MachineRtDashboardComponent } from '../hospital-machinert-mdashb/machine-rt-dashboard/machine-rt-dashboard.component';
import { HrDashboardComponent } from '../hr-dashboard/hr-dashboard.component';
import { DepartmentIncomeDashboardComponent } from "../incomeImporter/department-income-dashboard.component";
import { InfectionControlComponent } from "../infection-control/infection-control.component";
import { InfectionDrugsComponent } from '../infection-drugs/infection-drugs.component';
import { InfectionReportComponent } from "../infection-report/infection-report.component";
import { EmergencyRoomReportComponent } from "../emergency-room-report/emergency-room-report.component";
import { ImagingPerformanceDashboardComponent } from "../imaging-performance-dashboard/imaging-performance-dashboard.component";
import { MitavSummaryComponent } from "../mitav-summary/mitav-summary.component";
import { HitoFormsDashboardComponent } from "../hito-forms-dashboard/hito-forms-dashboard.component";
import { ClinicsForDashboardComponent } from '../ClinicsDashboard/clinics-dashboard.component';
import { InjuryReportComponent } from '../injury-report/injury-report.component';
import { IpPointsComponent } from '../ip-points/ip-points.component';
import { LabTestsComponent } from '../lab-tests/lab-tests.component';
import { LaborComponent } from '../labor/labor.component';
import { LearningRequestsDashboardComponent } from '../learning-requests-dashboard/learning-requests-dashboard.component';
import { LoginComponent } from '../login/login.component';
import { ManageClinicPriceComponent } from '../manage-clinic-price/manage-clinic-price.component';
import { MasterHpidComponent } from '../master-hpid/master-hpid.component';
import { MedicalRecordsDashboardComponent } from '../medical-records-dashboard/medical-records-dashboard.component';
import { MaternityParticipantsComponent } from "../maternity/maternity-participants/maternity-participants.component";
import { MaternityComponent } from "../maternity/maternity.component";
import { MaternitypatientsComponent } from "../maternitypatients/maternitypatients.component";
import { MedigateServersComponent } from '../medigate-servers/medigate-servers.component';
import { MershamNComponent } from '../mersham-n/mersham-n.component';
import { MershamComponent } from '../mersham/mersham.component';
import { MotherChildeLinkComponent } from "../mother-childe-link/mother-childe-link.component";
import { MrbaotComponent } from '../mrbaot/mrbaot.component';
import { MriScheduleComponent } from "../mri-schedule/mri-schedule.component";
import { NewBornComponent } from "../new-born/new-born.component";
import { NewbornDashboardComponent } from "../newborn-dashboard/newborn-dashboard.component";
import { NmrIframeComponent } from '../nmr-iframe/nmr-iframe.component';
import { NortonEstimateComponent } from '../norton-estimate/norton-estimate.component';
import { NursesDashboardComponent } from '../nurses-dashboard/nurses-dashboard.component';
import { NursesDepartmentManageComponent } from '../nurses-department-manage/nurses-department-manage.component';
import { NursesManageDashboardComponent } from '../nurses-manage-dashboard/nurses-manage-dashboard.component';
import { NursesReinforcementComponent } from '../nurses-manage-dashboard/nurses-reinforcement/nurses-reinforcement.component';
import { SystemManageComponent } from "../nurses-manage-dashboard/system-manage/system-manage.component";
import { DepartmentalTextureReportComponent } from "../nutrition-system/departmental-texture-report/departmental-texture-report.component";
import { NutritionSystemComponent } from '../nutrition-system/nutrition-system.component';
import { OnlineAppointmentsComponent } from "../online-appointments/online-appointments.component";
import { OrdersToAppointmentsComponent } from '../orders-to-appointments/orders-to-appointments.component';
import { PatientStikersComponent } from '../patient-stikers/patient-stikers.component';
import { PatientsSystemConflictsComponent } from '../patients-system-conflicts/patients-system-conflicts.component';
import { ProfileDeptAssociationComponent } from '../profile-dept-association/profile-dept-association.component';
import { PoriadepartsComponent } from '../poriadeparts/poriadeparts.component';
import { QualityMeasuresDashboardComponent } from '../quality-measures-dashboard/quality-measures-dashboard.component';
import { RehabilitationDashboardComponent } from '../rehabilitation-dashboard/rehabilitation-dashboard.component';
import { ReHospComponent } from '../re-hosp/re-hosp.component';
import { ReportReportingComponent } from '../report-reporting/report-reporting.component';
import { ResearchesComponent } from "../researches/researches.component";
import { ResearchespatientsComponent } from "../researchespatients/researchespatients.component";
import { ResearchesusersComponent } from "../researchesusers/researchesusers.component";
import { RolesComponent } from '../roles/roles.component';
import { Sarscov2Component } from "../sarscov2/sarscov2.component";
import { SarsresultsComponent } from "../sarsresults/sarsresults.component";
import { ScannersComponent } from "../scanners/scanners.component";
import { SendsmsComponent } from '../sendsms/sendsms.component';
import { SendsmsadminComponent } from '../sendsmsadmin/sendsmsadmin.component';
import { ServersForOnnlineComponent } from '../servers-for-onnline/servers-for-onnline.component';
import { ServersComponent } from '../servers/servers.component';
import { SpreadsheetComponent } from '../spreadsheets-dashboard/spreadsheet/spreadsheet.component';
import { SpreadsheetsDashboardComponent } from '../spreadsheets-dashboard/spreadsheets-dashboard.component';
import { StaffComponent } from '../staff/staff.component';
import { StikersComponent } from '../stikers/stikers.component';
import { SupplierComponent } from '../supplier/supplier.component';
import { SurgeriesDashboradComponent } from '../surgeries-dashborad-n/surgeries-dashborad.component';
import { PciDashboradComponent } from '../pci-dashborad-n/pci-dashborad.component';
import { SurgeryCalendarComponent } from '../surgery-calendar/surgery-calendar.component';
import { MachinesCalendarComponent } from '../machines-calendar/machines-calendar.component';
import { SurgeryControlMainComponent } from '../surgery-control-main/surgery-control-main.component';
import { SurgeriesUnclosedReportsComponent } from '../surgery-reports/surgeries-unclosed-reports/surgeries-unclosed-reports.component';
import { SurgeryReportsComponent } from '../surgery-reports/surgery-reports.component';
import { SurgeryComponent } from '../surgery/surgery.component';
import { TodayDashboardComponent } from '../TodayDashboardComponent/today-dashboard.component';
import { SwitchesComponent } from '../switches/switches.component';
import { UpdateformComponent } from '../updateform/updateform.component';
import { UpdatesingleformComponent } from '../updatesingleform/updatesingleform.component';
import { UrgentSurgeriesComponent } from "../urgent-surgeries/urgent-surgeries.component";
import { VisitorsMonitoringComponent } from "../visitors-monitoring/visitors-monitoring.component";
import { VisitorsRegistrationComponent } from "../visitors-monitoring/visitors-registration/visitors-registration.component";
import { WagonComponent } from '../wagon/wagon.component';
import { DepartmentsWhatsappManagementComponent } from '../whatsapp-departments-dashboard/departments-whatsapp-management/departments-whatsapp-management.component';
import { WhatsappDepartmentsDashboardComponent } from '../whatsapp-departments-dashboard/whatsapp-departments-dashboard.component';
import { WhatsappCategoriesPermissionsComponent } from '../whatsapp-messages-dashboard/whatsapp-categories-permissions/whatsapp-categories-permissions.component';
import { WhatsappLungCancerComponent } from '../whatsapp-messages-dashboard/whatsapp-lung-cancer/whatsapp-lung-cancer.component';
import { WhatsappMessagesDashboardComponent } from '../whatsapp-messages-dashboard/whatsapp-messages-dashboard.component';
import { WorkerCasesComponent } from '../worker-cases/worker-cases.component';
import { PermissionsReportComponent } from '../employees-manage-dash/permissions-report/permissions-report.component';
import { ResetPasswordHubComponent } from '../dashboard/reset-password-hub/reset-password-hub.component';
import { PendingAdmissionsComponent } from '../pending-admissions/pending-admissions.component';
import { DeliriumSummaryComponent } from '../delirium-summary/delirium-summary.component';
import { SupplierComplianceDashboardComponent } from '../supplier-compliance/supplier-compliance-dashboard/supplier-compliance-dashboard.component';
import { EmployeeFormCompletionDashboardComponent } from '../employee-form-completion/employee-form-completion-dashboard/employee-form-completion-dashboard.component';



const routes: Routes = [
  { path: "", component: LoginComponent },
  { path: "clinics-for-dashboard", component: ClinicsForDashboardComponent },
  { path: "supplier-compliance", component: SupplierComplianceDashboardComponent },
  { path: "employee-form-completion", component: EmployeeFormCompletionDashboardComponent },
  { path: 'clinicsrequests', component: ClinicsRequestsComponent },
  { path: 'reset-password-hub', component: ResetPasswordHubComponent },
  { path: "patientstikers", component: PatientStikersComponent },
  { path: 'profile-dept-association', component: ProfileDeptAssociationComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'today-dashboard', component: TodayDashboardComponent },
  { path: 'covid19report', component: Covid19reportComponent },
  { path: 'login', component: LoginComponent },
  { path: 'chads', component: ChadsComponent },
  { path: 'hearing', component: HearingComponent },
  { path: 'hearing-survey', component: HearingSurveyComponent },
  { path: 'surgery', component: SurgeryComponent },
  { path: 'mrbaot', component: MrbaotComponent },
  { path: 'eshboz', component: EshbozComponent },
  { path: 'dimot', component: DimotComponent },
  { path: 'labor', component: LaborComponent },
  { path: 'coronaform', component: CoronaformComponent },
  { path: 'poriadeparts', component: PoriadepartsComponent },
  { path: 'roles', component: RolesComponent },
  { path: 'staff', component: StaffComponent },
  { path: 'sendsms', component: SendsmsComponent },
  { path: 'sendsmsadmin', component: SendsmsadminComponent },
  { path: 'coronaresultform', component: CoronaresultformComponent },
  { path: 'glucose', component: GlucoseComponent },
  { path: 'mersham', component: MershamComponent },
  { path: 'drugs', component: DrugsComponent },
  { path: 'cortinas', component: CortinasComponent },
  { path: 'cortinasdeparts', component: CortinasdepartsComponent },
  { path: 'cortinasnotification', component: CortinasnotificationComponent },
  { path: 'colonoscopy', component: ColonoscopyComponent },
  { path: "coronavaccine", component: CoronavaccineComponent },
  { path: "consultations", component: ConsultationsComponent },
  { path: "researchesusers", component: ResearchesusersComponent },
  { path: "researchespatients", component: ResearchespatientsComponent },
  { path: "researches", component: ResearchesComponent },
  { path: "caseinvoises", component: CaseinvoisesComponent },
  { path: "sarscov2", component: Sarscov2Component },
  { path: "addpatientcoronaform", component: AddpatientcoronaformComponent },
  { path: "sarsresults", component: SarsresultsComponent },
  { path: "maternity", component: MaternityComponent },
  { path: "maternitypatients", component: MaternitypatientsComponent },
  { path: "emergencycallgroups", component: EmergencycallgroupsComponent },
  { path: "emergencymembers", component: EmergencymembersComponent },
  { path: "employees", component: EmployeesComponent },
  { path: "fillsurvey/:id", component: FillSurveyComponent },
  { path: "formdashboard", component: FormDashboardComponent },
  { path: "digitalforms", component: UpdateformComponent },
  { path: "eventsschedule", component: EventsscheduleComponent },
  { path: "createorupdateform/:id", component: UpdatesingleformComponent },
  { path: "formsanswered/:id", component: FormsansweredComponent },
  { path: "emailsdashboard", component: EmailsdashboardComponent },
  { path: "emailmanagement", component: EmailmanagementComponent },
  { path: "nursereportsystem", component: NursesDashboardComponent },
  { path: "fillreport", component: FillReportComponent },
  { path: "clinicspricing", component: ClinicsDashboardComponent },
  { path: "checkpatientinsmartcloset", component: CheckpatientinsmartclosetComponent },
  { path: "drugsnic", component: DrugsnicComponent },
  { path: "manageclinicprice", component: ManageClinicPriceComponent },
  { path: "nursesmanagedashboard", component: NursesManageDashboardComponent },
  { path: "nurse-permissions-manage", redirectTo: "nps-permissions", pathMatch: "full" },
  { path: "ep-permissions-manage", redirectTo: "ep-permissions", pathMatch: "full" },
  { path: "nursesdepartmentmanage", component: NursesDepartmentManageComponent },
  { path: "checkpatientinsmartcloset", component: CheckpatientinsmartclosetComponent },
  { path: "drugsnic", component: DrugsnicComponent },
  { path: "scanners", component: ScannersComponent },
  { path: "clinicspricing", component: ClinicsDashboardComponent },
  { path: "casenumbers", component: CasenumbersComponent },
  { path: "publicinquiriescharts", component: PublicInquiriesChartsComponent },
  { path: "visitorsmonitoring", component: VisitorsMonitoringComponent },
  { path: "visitorsregistration", component: VisitorsRegistrationComponent },
  { path: "fastcovid19test", component: FastCovid19TestComponent },
  { path: "fastcovidtestdashboard", component: FastCovidTestDashboardComponent },
  { path: "urgentsurgeries", component: UrgentSurgeriesComponent },
  { path: "onlineappointments", component: OnlineAppointmentsComponent },
  { path: "cardiologycalendar", component: CardiologyCalendarComponent },
  { path: "addupdateaction", component: AddupdateactionComponent },
  { path: "motherchildelink", component: MotherChildeLinkComponent },
  { path: "devmanage", component: DevManageComponent },
  { path: "systemmanage", component: SystemManageComponent },
  { path: "galitpointsreport", component: GalitPointsReportComponent },
  { path: "nmriframe", component: NmrIframeComponent },
  { path: "employeesmanagedashboard", component: EmployeesManageDashComponent },
  { path: "employeesaddupdate", component: EmployeesAddUpdateComponent },
  { path: "orderstoappointments", component: OrdersToAppointmentsComponent },
  { path: "reinforcement", component: NursesReinforcementComponent },
  { path: "BIDashboard", component: HospitalBIDashboardComponent },
  { path: "GraphsModalComponent", component: GraphsModalComponent },
  { path: "EshpozModalComponent", component: EshpozModalComponent },
  { path: "InfectionDrugs", component: InfectionDrugsComponent },
  { path: "InfectionReport", component: InfectionReportComponent },
  { path: "EmergencyRoomReport", component: EmergencyRoomReportComponent },
  {
    path: 'EmergencyRoomReport/:department',
    component: EmergencyRoomReportComponent
  },
  { path: "ImagingPerformanceDashboard", component: ImagingPerformanceDashboardComponent },
{  path: "MitavSummary", component: MitavSummaryComponent },
{ path: "DeliriumSummary", component: DeliriumSummaryComponent },
{ path: "medical-records-dashboard", component: MedicalRecordsDashboardComponent },
  { path: "hito-forms-dashboard", component: HitoFormsDashboardComponent },
  { path: "newborn", component: NewBornComponent },
  { path: "newborn-dashboard", component: NewbornDashboardComponent },
  { path: "rehabilitation-dashboard", component: RehabilitationDashboardComponent },
  { path: "MaternityParticipants", component: MaternityParticipantsComponent },
  { path: "CprForm", component: CprFormComponent },
  { path: "TumorBoardComponent", component: TumorBoardComponent },
  { path: "TumorBoardModalComponent", component: TumorBoardModalComponent },
  { path: "drugprotocols", component: DrugProtocolsComponent },
  { path: "mershamn", component: MershamNComponent },
  { path: "servers", component: ServersComponent },
  { path: "stikers", component: StikersComponent },
  { path: "medigate", component: MedigateServersComponent },
  { path: "surgerycontrolmain", component: SurgeryControlMainComponent },
  { path: "cpr-additional-tables", component: AdditionalCprTablesComponent },
  { path: "servers4onnline", component: ServersForOnnlineComponent },
  { path: "ippoints", component: IpPointsComponent },
  { path: "masterhpid", component: MasterHpidComponent },
  { path: "cables", component: CablesComponent },
  { path: "surgery-calendar", component: SurgeryCalendarComponent },
  { path: "machines-calendar", component: MachinesCalendarComponent },
  { path: "follow-up", component: FollowUpComponent },
  { path: "surgeryreport", component: SurgeryReportsComponent },
  { path: "quality-measures", component: QualityMeasuresDashboardComponent },
  { path: "bone-marrow", component: BoneMarrowComponent },
  { path: "bone-marrow-modal", component: BoneMarrowModalComponent },
  { path: "wagons", component: WagonComponent },
  { path: "whatsapp-dashboard", component: WhatsappMessagesDashboardComponent },
  { path: "nutrition-dashboard", component: NutritionSystemComponent },
  { path: 'switches', component: SwitchesComponent },
  { path: 'hr-dashboard', component: HrDashboardComponent },
  { path: 'Norton', component: NortonEstimateComponent },
  { path: "CAM", component: CAMEstimateComponent },
  { path: "Dialysis", component: DialysisReportComponent },
  { path: "DialysisPatients", component: DialysisReportPatientsComponent },
  { path: "Surgeries-unclosed-reports", component: SurgeriesUnclosedReportsComponent },
  { path: "departments-whatsapp", component: WhatsappDepartmentsDashboardComponent },
  { path: "Injury", component: InjuryReportComponent },
  { path: "Cath", component: CathReportComponent },
  { path: "IncomeDashboard", component: DepartmentIncomeDashboardComponent },
  { path: "surgeriesDashboard", component: SurgeriesDashboradComponent },
  { path: "pciDashboard", component: PciDashboradComponent },
  { path: "AutomationProcessDashboard", component: AutomationProcessDashboardComponent },
  { path: "patients-system-conflicts", component: PatientsSystemConflictsComponent },
  { path: "Metav", component: BTirmComponent },
  { path: "Reporting", component: ReportReportingComponent },
  { path: "ReHosp", component: ReHospComponent },
  { path: "employees-update-managers", component: EmployeesUpdateManagersComponent },
  { path: "Reporting", component: ReportReportingComponent },
  { path: "WorkerCases", component: WorkerCasesComponent },
  { path: "bedsore-dashboard", component: BedsoreDashboardComponent },
  { path: "Reporting", component: ReportReportingComponent },
  { path: "authorized", component: AuthorizedComponent },
  { path: "suppliers", component: SupplierComponent },
  { path: "spreadsheet", component: SpreadsheetComponent },
  { path: "spreadsheets-dashboard", component: SpreadsheetsDashboardComponent },
  { path: "hospital-tonnage", component: HospitalTonnageComponent },
  { path: "folder-tree", component: FolderTreeComponent },
  { path: "LabTests", component: LabTestsComponent },
  { path: "clinicactivitydashboard", component: ClinicActivityDashboardComponent },
  { path: "departments-whatsapp-management", component: DepartmentsWhatsappManagementComponent },
  { path: "training-request-dashboard", component: TrainingRequestDashboardComponent },
  { path: "training-request-form/:id", component: TrainingRequestFormComponent },
  { path: "training-request-dialog", component: TrainingRequestDialogComponent },
  { path: "whatsapp-lung-cancer", component: WhatsappLungCancerComponent },
  { path: "shortcuts-management", component: ShortcutsManagementComponent },
  { path: "shortcut-form-dialog", component: ShortcutFormDialogComponent },
  { path: "namer-user-actions", component: NamerUserActionsComponent },
  { path: "learning-requests-dashboard", component: LearningRequestsDashboardComponent },
  { path: "cpr-newbord-dashborad", component: CprNewbordDashboradComponent },
  { path: "cpr-newborn-form", component: CprNewbornFormComponent },
  { path: "LabTests", component: LabTestsComponent },
  { path: "departments-whatsapp-management", component: DepartmentsWhatsappManagementComponent },
  { path: "training-request-dashboard", component: TrainingRequestDashboardComponent },
  { path: "training-request-form", component: TrainingRequestFormComponent },
  { path: "training-request-dialog", component: TrainingRequestDialogComponent },
  { path: "whatsapp-lung-cancer", component: WhatsappLungCancerComponent },
  { path: "whatsapp-categories-permissions", component: WhatsappCategoriesPermissionsComponent },
  { path: "shortcuts-management", component: ShortcutsManagementComponent },
  { path: "shortcut-form-dialog", component: ShortcutFormDialogComponent },
  { path: "namer-user-actions", component: NamerUserActionsComponent },
  { path: "learning-requests-dashboard", component: LearningRequestsDashboardComponent },
  { path: "LabTests", component: LabTestsComponent },
  { path: "departments-whatsapp-management", component: DepartmentsWhatsappManagementComponent },
  { path: "training-request-dashboard", component: TrainingRequestDashboardComponent },
  { path: "training-request-form/:id", component: TrainingRequestFormComponent },
  { path: "training-request-dialog", component: TrainingRequestDialogComponent },
  { path: "whatsapp-lung-cancer", component: WhatsappLungCancerComponent },
  { path: "shortcuts-management", component: ShortcutsManagementComponent },
  { path: "shortcut-form-dialog", component: ShortcutFormDialogComponent },
  { path: "namer-user-actions", component: NamerUserActionsComponent },
  { path: "learning-requests-dashboard", component: LearningRequestsDashboardComponent },
  { path: "cpr-newbord-dashborad", component: CprNewbordDashboradComponent },
  { path: "cpr-newborn-form", component: CprNewbornFormComponent },
  { path: "commercial-support-form-dashboard", component: CommercialSupportFormDashboardComponent },
  { path: "commercial-support-form-dialog", component: CommercialSupportFormDialogComponent },
  { path: "commercial-support-research-dialog", component: CommercialSupportResearchDialogComponent },
  { path: "commercial-support-procurement-dialog", component: CommercialSupportProcurementDialogComponent },
  { path: "commercial-support-presentation-dialog", component: CommercialSupportFormDialogComponent },
  { path: "commercial-support-gathering-dialog", component: CommercialSupportGatheringComponent },
  { path: "LabTests", component: LabTestsComponent },
  { path: "departments-whatsapp-management", component: DepartmentsWhatsappManagementComponent },
  { path: "training-request-dashboard", component: TrainingRequestDashboardComponent },
  { path: "training-request-form/:id", component: TrainingRequestFormComponent },
  { path: "training-request-dialog", component: TrainingRequestDialogComponent },
  { path: "whatsapp-lung-cancer", component: WhatsappLungCancerComponent },
  { path: "shortcuts-management", component: ShortcutsManagementComponent },
  { path: "shortcut-form-dialog", component: ShortcutFormDialogComponent },
  { path: "namer-user-actions", component: NamerUserActionsComponent },
  { path: "learning-requests-dashboard", component: LearningRequestsDashboardComponent },
  { path: "cpr-newbord-dashborad", component: CprNewbordDashboradComponent },
  { path: "cpr-newborn-form", component: CprNewbornFormComponent },
  { path: "LabTests", component: LabTestsComponent },
  { path: "hospital-cath-dashb", component: GoogleChartsComponent },
  { path: "hospital-current-patients-dashb", loadChildren: () => import("../hospital-current-patients-dashboard/hospital-current-patients-dashboard.module").then(m => m.HospitalCurrentPatientsDashboardModule) },
  { path: "hospital-roomtime-dashb", component: RoomTimeDashboardComponent },
  { path: "hospital-roomtimen-dashb", component: RoomTimeNDashboardComponent },
  { path: "hospital-roomtimert-dashb", component: RoomTimeRTDashboardComponent },
  { path: "hospital-roomtimert-mdashb", component: RoomTimeRTmDashboardComponent },
  { path: "hospital-machinert-mdashb", component: MachineRtDashboardComponent },
  { path: 'clinicsrequests', component: ClinicsRequestsComponent },
  { path: 'cldashboard', component: FullPageDashboardComponent },
  { path: 'service-unit-email-list', component: ServiceUnitEmailListComponent },
  { path: 'service-unit-email-list-dialog', component: ServiceUnitEmailListDialogComponent },
  { path: "hospitalincomedashb", component: HospitalIncomeDashbComponent },
  { path: "hospital-income-dashb", component: GoogleChartsIncomeComponent },
  { path: "folders-management", component: FoldersManagementComponent },
  { path: "folders-dialog", component: FolderDialogComponent },
  { path: "hospital-incomenb-dashb", component: GoogleChartsIncomeNBComponent },
  { path: "hospital-appoints-dashb", component: AppointsDashboardComponent },
  { path: "dimotactivity", component: DimotActivityDashboardComponent },
  { path: "hospital-appointscl-dashb", component: AppointsCLDashboardComponent },
  { path: "departmental-texture-report", component: DepartmentalTextureReportComponent },
  { path: "windows-user-actions", component: WindowsUserActionsComponent },
  { path: "ai-letters-dashboard", component: AiLettersDashboardComponent },
  { path: "mri-schedule", component: MriScheduleComponent },
  { path: "InfectionControl", component: InfectionControlComponent },
  { path: "ClinicsDashboard", component: ClinicsForDashboardComponent },
  { path: "medical-interns-dashboard", component: MedicalInternsDashboardComponent },
  { path: "medical-intern-add-update", component: MedicalInternAddUpdateComponent },
  { path: "intern-departments-manage/:EmployeeID", component: InternDepartmentsManageComponent },
  { path: "intern-department-assignment-dialog", component: InternDepartmentAssignmentDialogComponent },
  { path: "medical-interns-sms", component: MedicalInternsSmsComponent },
  { path: "lectures-manage-dialog", component: LecturesManageDialogComponent },

  { path: "pending-admissions", component: PendingAdmissionsComponent },
  { path: "imagestoreBI", component: MedicalRecordsDashboardComponent },
  {
    path: "ep-permissions",
    loadChildren: () =>
      import("../ep-permissions/ep-permissions.module").then((m) => m.EpPermissionsModule),
  },
  {
    path: "nps-permissions",
    loadChildren: () =>
      import("../nps-permissions/nps-permissions.module").then((m) => m.NpsPermissionsModule),
  },
  {
    path: "invasive-procedures",
    loadChildren: () =>
      import("../invasive-procedures/invasive-procedures.module").then(
        (m) => m.InvasiveProceduresModule
      ),
  },
  {
    path: "training-management",
    loadChildren: () =>
      import("../training-management/training-management.module").then(
        (m) => m.TrainingManagementModule
      ),
  },
  {
    path: "doctors-permissions",
    loadChildren: () =>
      import("../doctors-permissions/doctors-permissions.module").then(
        (m) => m.DoctorsPermissionsModule
      ),
  },
  {
    path: "form29",
    loadChildren: () =>
      import("../form29/form29.module").then((m) => m.Form29Module),
  },
  { path: "permissions-report", component: PermissionsReportComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { relativeLinkResolution: 'legacy' }),

  ],
  exports: [
    //ConfirmationDialogComponent,
    RouterModule
  ],
  providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }],
  declarations: [
    //ConfirmationDialogComponent
  ]
})
export class AppRoutingModule { }