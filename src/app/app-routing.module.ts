import { HashLocationStrategy, LocationStrategy } from "@angular/common";
import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { LoginComponent } from "./login/login.component";
import { ChadsComponent } from "./chads/chads.component";
import { HearingComponent } from "./hearing/hearing.component";
import { SurgeryComponent } from "./surgery/surgery.component";
import { MrbaotComponent } from "./mrbaot/mrbaot.component";
import { EshbozComponent } from "./eshboz/eshboz.component";
import { DimotComponent } from "./dimot/dimot.component";
import { CoronaformComponent } from "./coronaform/coronaform.component";
import { PoriadepartsComponent } from "./poriadeparts/poriadeparts.component";
import { SendsmsComponent } from "./sendsms/sendsms.component";
import { SendsmsadminComponent } from "./sendsmsadmin/sendsmsadmin.component";
import { RolesComponent } from "./roles/roles.component";
import { CoronaresultformComponent } from "./coronaresultform/coronaresultform.component";
import { GlucoseComponent } from "./glucose/glucose.component";
import { MershamComponent } from "./mersham/mersham.component";
import { DrugsComponent } from "./drugs/drugs.component";
import { CortinasComponent } from "./cortinas/cortinas.component";
import { CortinasdepartsComponent } from "./cortinasdeparts/cortinasdeparts.component";
import { CortinasnotificationComponent } from "./cortinasnotification/cortinasnotification.component";
import { CoronavaccineComponent } from "./coronavaccine/coronavaccine.component";
import { Covid19reportComponent } from "./covid19report/covid19report.component";
import { ConsultationsComponent } from "./consultations/consultations.component";
import { ResearchesusersComponent } from "./researchesusers/researchesusers.component";
import { ResearchespatientsComponent } from "./researchespatients/researchespatients.component";
import { ResearchesComponent } from "./researches/researches.component";
import { Sarscov2Component } from "./sarscov2/sarscov2.component";
import { AddpatientcoronaformComponent } from "./addpatientcoronaform/addpatientcoronaform.component";
import { SarsresultsComponent } from "./sarsresults/sarsresults.component";
import { MaternityComponent } from "./maternity/maternity.component";
import { MaternitypatientsComponent } from "./maternitypatients/maternitypatients.component";
import { EmergencycallgroupsComponent } from "./emergencycallgroups/emergencycallgroups.component";
import { EmergencymembersComponent } from "./emergencymembers/emergencymembers.component";
import { EmployeesComponent } from "./employees/employees.component";
import { FillSurveyComponent } from "./fill-survey/fill-survey.component";
import { FormDashboardComponent } from "./form-dashboard/form-dashboard.component";
import { UpdateformComponent } from "./updateform/updateform.component";
import { UpdatesingleformComponent } from "./updatesingleform/updatesingleform.component";
import { FormsansweredComponent } from "./formsanswered/formsanswered.component";
import { EmailsdashboardComponent } from "./emailsdashboard/emailsdashboard.component";
import { EmailmanagementComponent } from "./emailmanagement/emailmanagement.component";
import { NursesDashboardComponent } from "./nurses-dashboard/nurses-dashboard.component";
import { FillReportComponent } from "./fill-report/fill-report.component";
import { ClinicsDashboardComponent } from "./clinics-dashboard/clinics-dashboard.component";
import { CheckpatientinsmartclosetComponent } from "./checkpatientinsmartcloset/checkpatientinsmartcloset.component";
import { DrugsnicComponent } from "./drugsnic/drugsnic.component";
import { ManageClinicPriceComponent } from "./manage-clinic-price/manage-clinic-price.component";
import { ScannersComponent } from "./scanners/scanners.component";
import { CasenumbersComponent } from "./casenumbers/casenumbers.component";
import { PublicInquiriesChartsComponent } from "./emailsdashboard/public-inquiries-charts/public-inquiries-charts.component";
import { VisitorsMonitoringComponent } from "./visitors-monitoring/visitors-monitoring.component";
import { VisitorsRegistrationComponent } from "./visitors-monitoring/visitors-registration/visitors-registration.component";
import { FastCovid19TestComponent } from "./fast-covid19-test/fast-covid19-test.component";
import { FastCovidTestDashboardComponent } from "./fast-covid-test-dashboard/fast-covid-test-dashboard.component";
import { UrgentSurgeriesComponent } from "./urgent-surgeries/urgent-surgeries.component";
import { OnlineAppointmentsComponent } from "./online-appointments/online-appointments.component";
import { CardiologyCalendarComponent } from "./cardiology-calendar/cardiology-calendar.component";
import { AddupdateactionComponent } from "./cardiology-calendar/addupdateaction/addupdateaction.component";
import { MotherChildeLinkComponent } from "./mother-childe-link/mother-childe-link.component";
import { DevManageComponent } from "./dev-manage/dev-manage.component";
import { SystemManageComponent } from "./nurses-manage-dashboard/system-manage/system-manage.component";
import { DialogBoxComponent } from "./nurses-manage-dashboard/system-manage/dialog-box/dialog-box.component";
import { GalitPointsReportComponent } from "./galit-points-report/galit-points-report.component";
import { BugReportComponent } from "./nurses-department-manage/nurses-department-manage.component";
import { NmrIframeComponent } from "./nmr-iframe/nmr-iframe.component";
import { EmployeesManageDashComponent } from "./employees-manage-dash/employees-manage-dash.component";
import { EmployeesAddUpdateComponent } from "./employees-manage-dash/employees-add-update/employees-add-update.component";
import { OrdersToAppointmentsComponent } from "./orders-to-appointments/orders-to-appointments.component";
import { NursesReinforcementComponent } from "./nurses-manage-dashboard/nurses-reinforcement/nurses-reinforcement.component";
import { HospitalBIDashboardComponent } from "./hospital-bi-dashboard/hospital-bi-dashboard.component";
import { GraphsModalComponent } from "./hospital-bi-dashboard/graphs-modal/graphs-modal.component";
import { EshpozModalComponent } from "./hospital-bi-dashboard/eshpoz-modal/eshpoz-modal.component";
import { InfectionDrugsComponent } from "./infection-drugs/infection-drugs.component";
import { InfectionReportComponent } from "./infection-report/infection-report.component";
import { NewBornComponent } from "./new-born/new-born.component";
import { MaternityParticipantsComponent } from "./maternity/maternity-participants/maternity-participants.component";
import { CprFormComponent } from "./form-dashboard/cpr-form/cpr-form.component";
import { TumorBoardComponent } from "./form-dashboard/tumor-board/tumor-board.component";
import { TumorBoardModalComponent } from "./form-dashboard/tumor-board/tumor-board-modal/tumor-board-modal.component";
import { DrugProtocolsComponent } from "./drug-protocols/drug-protocols.component";
import { MershamNComponent } from "./mersham-n/mersham-n.component";
import { ServersComponent } from "./servers/servers.component";
import { StikersComponent } from "./stikers/stikers.component";
import { MedigateServersComponent } from "./medigate-servers/medigate-servers.component";
import { SurgeryControlMainComponent } from "./surgery-control-main/surgery-control-main.component";
import { ServersForOnnlineComponent } from "./servers-for-onnline/servers-for-onnline.component";
import { IpPointsComponent } from "./ip-points/ip-points.component";
import { MasterHpidComponent } from "./master-hpid/master-hpid.component";
import { CablesComponent } from "./cables/cables.component";
import { SurgeryCalendarComponent } from "./surgery-calendar/surgery-calendar.component";
import { FollowUpComponent } from "./consultations/follow-up/follow-up.component";
import { SurgeryReportsComponent } from "./surgery-reports/surgery-reports.component";
import { BoneMarrowComponent } from "./form-dashboard/bone-marrow/bone-marrow.component";
import { WhatsappMessagesDashboardComponent } from "./whatsapp-messages-dashboard/whatsapp-messages-dashboard.component";
import { BoneMarrowModalComponent } from "./form-dashboard/bone-marrow/bone-marrow-modal/bone-marrow-modal.component";
import { QualityMeasuresDashboardComponent } from "./quality-measures-dashboard/quality-measures-dashboard.component";
import { NutritionSystemComponent } from "./nutrition-system/nutrition-system.component";
import { ClinicsRequestsComponent } from "./clinics-requests/clinics-requests.component";
import { WagonComponent } from "./wagon/wagon.component";
import { SwitchesComponent } from "./switches/switches.component";
import { HrDashboardComponent } from "./hr-dashboard/hr-dashboard.component";
import { PatientStikersComponent } from "./patient-stikers/patient-stikers.component";
import { NortonEstimateComponent } from './norton-estimate/norton-estimate.component';
import { CAMEstimateComponent } from './cam-estimate/cam-estimate.component';
import { DialysisReportComponent } from './dialysis-report/dialysis-report.component';
import { SurgeriesUnclosedReportsComponent } from './surgery-reports/surgeries-unclosed-reports/surgeries-unclosed-reports.component';
import { InjuryReportComponent } from './injury-report/injury-report.component';
import { WhatsappDepartmentsDashboardComponent } from './whatsapp-departments-dashboard/whatsapp-departments-dashboard.component';
import { CathReportComponent } from './cath-report/cath-report.component';
import { PatientsSystemConflictsComponent } from "./patients-system-conflicts/patients-system-conflicts.component";
import { EmployeesUpdateManagersComponent } from "./employees-manage-dash/employees-update-managers/employees-update-managers.component";
import { WorkerCasesComponent } from "./worker-cases/worker-cases.component";
import { BedsoreDashboardComponent } from "./form-dashboard/bedsore-dashboard/bedsore-dashboard.component";
import { AuthorizedComponent } from './authorized/authorized.component';
import { SupplierComponent } from "./supplier/supplier.component";
import { LabTestsComponent } from "./lab-tests/lab-tests.component";
import { SpreadsheetComponent } from "./spreadsheets-dashboard/spreadsheet/spreadsheet.component";
import { SpreadsheetsDashboardComponent } from "./spreadsheets-dashboard/spreadsheets-dashboard.component";
import { TreeItemDialogComponent } from "./new-header/tree-item-dialog/tree-item-dialog.component";
import { HospitalTonnageComponent } from "./hospital-bi-dashboard/hospital-tonnage/hospital-tonnage.component";
import { FolderTreeComponent } from "./dashboard/folder-tree/folder-tree.component";
import { ClinicActivityDashboardComponent } from "./clinic-activity-dashboard/clinic-activity-dashboard.component";
import { DepartmentsWhatsappManagementComponent } from "./whatsapp-departments-dashboard/departments-whatsapp-management/departments-whatsapp-management.component";
import { TrainingRequestDashboardComponent } from "./form-dashboard/training-request-dashboard/training-request-dashboard.component";
import { TrainingRequestFormComponent } from "./form-dashboard/training-request-dashboard/training-request-form/training-request-form.component";
import { TrainingRequestDialogComponent } from "./form-dashboard/training-request-dashboard/training-request-dialog/training-request-dialog.component";
import { WhatsappLungCancerComponent } from "./whatsapp-messages-dashboard/whatsapp-lung-cancer/whatsapp-lung-cancer.component";
import { WhatsappCategoriesPermissionsComponent } from "./whatsapp-messages-dashboard/whatsapp-categories-permissions/whatsapp-categories-permissions.component";
import { ShortcutsManagementComponent } from "./dashboard/shortcuts-management/shortcuts-management.component";
import { ShortcutFormDialogComponent } from "./dashboard/shortcuts-management/shortcut-form-dialog/shortcut-form-dialog.component";
import { NamerUserActionsComponent } from "./dashboard/namer-user-actions/namer-user-actions.component";
import { LearningRequestsDashboardComponent } from "./learning-requests-dashboard/learning-requests-dashboard.component";
import { CprNewbordDashboradComponent } from "./form-dashboard/cpr-newbord-dashborad/cpr-newbord-dashborad.component";
import { CprNewbornFormComponent } from "./form-dashboard/cpr-newbord-dashborad/cpr-newborn-form/cpr-newborn-form.component";
import { GoogleChartsComponent } from './hospital-cath-dashb/google-charts/google-charts.component';
import { RoomTimeDashboardComponent } from './hospital-roomtime-dashb/google-charts/google-charts.component';
import { RoomTimeNDashboardComponent } from './hospital-roomtimen-dashb/google-charts/google-charts.component';
import { RoomTimeRTDashboardComponent } from './hospital-roomtimert-dashb/google-charts/google-charts.component';
import { RoomTimeRTmDashboardComponent } from './hospital-roomtimert-mdashb/google-charts/google-charts.component';
import { CommercialSupportFormDashboardComponent } from "./form-dashboard/commercial-support-form-dashboard/commercial-support-form-dashboard.component";
import { CommercialSupportFormDialogComponent } from "./form-dashboard/commercial-support-form-dashboard/commercial-support-form-dialog/commercial-support-form-dialog.component";
import { CommercialSupportResearchDialogComponent } from "./form-dashboard/commercial-support-form-dashboard/commercial-support-research-dialog/commercial-support-research-dialog.component";
import { CommercialSupportPresentationDialogComponent } from "./form-dashboard/commercial-support-form-dashboard/commercial-support-presentation-dialog/commercial-support-presentation-dialog.component";
import { CommercialSupportGatheringComponent } from "./form-dashboard/commercial-support-form-dashboard/commercial-support-gathering/commercial-support-gathering.component";
import { ServiceUnitEmailListComponent } from './emailsdashboard/service-unit-email-list/service-unit-email-list.component';
import { ServiceUnitEmailListDialogComponent } from './emailsdashboard/service-unit-email-list/service-unit-email-list-dialog/service-unit-email-list-dialog.component';
import { HospitalIncomeDashbComponent } from './hospital-income-dashb/hospital-income-dashb.component';
import { GoogleChartsIncomeComponent } from './hospital-income-dashb/google-charts/google-charts.component';
import { HospitalIncomeNBDashbComponent } from "./hospital-incomenb-dashb/hospital-incomenb-dashb.component";
import { HospitalRoomTimeRTDashbComponent } from "./hospital-roomtimert-dashb/hospital-roomtimert-dashb.component";
import { GoogleChartsIncomeNBComponent } from "./hospital-incomenb-dashb/google-charts/google-charts.component";
import { FoldersManagementComponent } from "./dashboard/folders-management/folders-management.component";
import { FolderDialogComponent } from "./dashboard/folders-management/folder-dialog/folder-dialog.component";
import { DimotActivityDashboardComponent } from "./dimot-activity-dashboard/dimot-activity-dashboard.component";
import { DepartmentIncomeDashboardComponent } from "./incomeImporter/department-income-dashboard.component";
import { AutomationProcessDashboardComponent } from "./automationprocessdashboard/automation-process-dashboard.component";




const routes: Routes = [
    { path: "AutomationProcessDashboard", component: AutomationProcessDashboardComponent },
    { path: "IncomeDashboard", component: DepartmentIncomeDashboardComponent },
    { path: "dimotactivity", component: DimotActivityDashboardComponent },
    { path: "patientstikers", component: PatientStikersComponent },
    { path: "clinicsrequests", component: ClinicsRequestsComponent },
    { path: 'switches', component: SwitchesComponent },
    { path: "dashboard", component: DashboardComponent },
    { path: "login", component: LoginComponent },
    { path: "chads", component: ChadsComponent },
    { path: "hearing", component: HearingComponent },
    { path: "surgery", component: SurgeryComponent },
    { path: "mrbaot", component: MrbaotComponent },
    { path: "eshboz", component: EshbozComponent },
    { path: "dimot", component: DimotComponent },
    { path: "coronaform", component: CoronaformComponent },
    { path: "poriadeparts", component: PoriadepartsComponent },
    { path: "roles", component: RolesComponent },
    { path: "sendsms", component: SendsmsComponent },
    { path: "sendsmsadmin", component: SendsmsadminComponent },
    { path: "coronaresultform", component: CoronaresultformComponent },
    { path: "glucose", component: GlucoseComponent },
    { path: "mersham", component: MershamComponent },
    { path: "drugs", component: DrugsComponent },
    { path: "cortinas", component: CortinasComponent },
    { path: "cortinasdeparts", component: CortinasdepartsComponent },
    { path: "coronavaccine", component: CoronavaccineComponent },
    { path: "cortinasnotification", component: CortinasnotificationComponent },
    { path: "covid19report", component: Covid19reportComponent },
    { path: "consultations", component: ConsultationsComponent },
    { path: "researchesusers", component: ResearchesusersComponent },
    { path: "researchespatients", component: ResearchespatientsComponent },
    { path: "researches", component: ResearchesComponent },
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
    { path: "createorupdateform/:id", component: UpdatesingleformComponent },
    { path: "formsanswered/:id", component: FormsansweredComponent },
    { path: "emailsdashboard", component: EmailsdashboardComponent },
    { path: "emailmanagement", component: EmailmanagementComponent },
    { path: "nursereportsystem", component: NursesDashboardComponent },
    { path: "fillreport", component: FillReportComponent },
    { path: "clinicspricing", component: ClinicsDashboardComponent },
    {
        path: "checkpatientinsmartcloset",
        component: CheckpatientinsmartclosetComponent,
    },
    { path: "drugsnic", component: DrugsnicComponent },
    { path: "manageclinicprice", component: ManageClinicPriceComponent },
    {
        path: "checkpatientinsmartcloset",
        component: CheckpatientinsmartclosetComponent,
    },
    { path: "scanners", component: ScannersComponent },
    { path: "clinicspricing", component: ClinicsDashboardComponent },
    { path: "drugsnic", component: DrugsnicComponent },
    { path: "casenumbers", component: CasenumbersComponent },
    {
        path: "publicinquiriescharts",
        component: PublicInquiriesChartsComponent,
    },
    { path: "visitorsmonitoring", component: VisitorsMonitoringComponent },
    { path: "visitorsregistration", component: VisitorsRegistrationComponent },
    { path: "fastcovid19test", component: FastCovid19TestComponent },
    {
        path: "fastcovidtestdashboard",
        component: FastCovidTestDashboardComponent,
    },
    { path: "urgentsurgeries", component: UrgentSurgeriesComponent },
    { path: "onlineappointments", component: OnlineAppointmentsComponent },
    { path: "cardiologycalendar", component: CardiologyCalendarComponent },
    { path: "addupdateaction", component: AddupdateactionComponent },
    { path: "motherchildelink", component: MotherChildeLinkComponent },
    { path: "devmanage", component: DevManageComponent },
    { path: "systemmanage", component: SystemManageComponent },
    { path: "dialogbox", component: DialogBoxComponent },
    { path: "galitpointsreport", component: GalitPointsReportComponent },
    { path: "bugreport", component: BugReportComponent },
    { path: "nmriframe", component: NmrIframeComponent },
    {
        path: "employeesmanagedashboard",
        component: EmployeesManageDashComponent,
    },
    { path: "employeesaddupdate", component: EmployeesAddUpdateComponent },
    { path: "orderstoappointments", component: OrdersToAppointmentsComponent },
    { path: "reinforcement", component: NursesReinforcementComponent },
    { path: "BIDashboard", component: HospitalBIDashboardComponent },
    { path: "GraphsModalComponent", component: GraphsModalComponent },
    { path: "EshpozModalComponent", component: EshpozModalComponent },
    { path: "InfectionDrugs", component: InfectionDrugsComponent },
    { path: "InfectionReport", component: InfectionReportComponent },
    { path: "newborn", component: NewBornComponent },
    {
        path: "MaternityParticipants",
        component: MaternityParticipantsComponent,
    },
    { path: "CprForm", component: CprFormComponent },
    { path: "TumorBoardComponent", component: TumorBoardComponent },
    { path: "TumorBoardModalComponent", component: TumorBoardModalComponent },
    { path: "drugprotocols", component: DrugProtocolsComponent },
    { path: "mershamn", component: MershamNComponent },
    { path: "servers", component: ServersComponent },
    { path: "stikers", component: StikersComponent },
    { path: "medigate", component: MedigateServersComponent },
    { path: "surgerycontrolmain", component: SurgeryControlMainComponent },
    { path: "servers4onnline", component: ServersForOnnlineComponent },
    { path: "ippoints", component: IpPointsComponent },
    { path: "masterhpid", component: MasterHpidComponent },
    { path: "cables", component: CablesComponent },
    { path: "surgery-calendar", component: SurgeryCalendarComponent },
    { path: "follow-up", component: FollowUpComponent },
    { path: "surgeryreport", component: SurgeryReportsComponent },
    { path: "wagons", component: WagonComponent },
    { path: "quality-measures", component: QualityMeasuresDashboardComponent },
    { path: "bone-marrow", component: BoneMarrowComponent },
    { path: "bone-marrow-modal", component: BoneMarrowModalComponent },
    { path: "whatsapp-dashboard", component: WhatsappMessagesDashboardComponent },
    { path: "nutrition-dashboard", component: NutritionSystemComponent },
    { path: "hr-dashboard", component: HrDashboardComponent },
    { path: "Norton", component: NortonEstimateComponent },
    { path: "CAM", component: CAMEstimateComponent },
    { path: "Diaysis", component: DialysisReportComponent },
    { path: "Surgeries-unclosed-reports", component: SurgeriesUnclosedReportsComponent },
    { path: "departments-whatsapp", component: WhatsappDepartmentsDashboardComponent },
    { path: "Injury", component: InjuryReportComponent },
    { path: "Cath", component: CathReportComponent },
    { path: "employees-update-managers", component: EmployeesUpdateManagersComponent },
    { path: "patients-system-conflicts", component: PatientsSystemConflictsComponent },
    { path: "WorkerCases", component: WorkerCasesComponent },
    { path: "bedsore-dashboard", component: BedsoreDashboardComponent },
    { path: "patients-system-conflicts", component: PatientsSystemConflictsComponent },
    { path: "authorized", component: AuthorizedComponent },
    { path: "authorized", component: AuthorizedComponent },
    { path: "suppliers", component: SupplierComponent },
    { path: "tree-item-dialog", component: TreeItemDialogComponent },
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
    { path: "whatsapp-categories-permissions", component: WhatsappCategoriesPermissionsComponent },
    { path: "shortcuts-management", component: ShortcutsManagementComponent },
    { path: "shortcut-form-dialog", component: ShortcutFormDialogComponent },
    { path: "namer-user-actions", component: NamerUserActionsComponent },
    { path: "learning-requests-dashboard", component: LearningRequestsDashboardComponent },
    { path: "cpr-newbord-dashborad", component: CprNewbordDashboradComponent },
    { path: "cpr-newborn-form", component: CprNewbornFormComponent },
    { path: "LabTests", component: LabTestsComponent },
    { path: "cpr-newbord-dashborad", component: CprNewbordDashboradComponent },
    { path: "cpr-newborn-form", component: CprNewbornFormComponent },
    { path: "commercial-support-form-dashboard", component: CommercialSupportFormDashboardComponent },
    { path: "commercial-support-form-dialog", component: CommercialSupportFormDialogComponent },
    { path: "commercial-support-research-dialog", component: CommercialSupportResearchDialogComponent },
    { path: "commercial-support-presentation-dialog", component: CommercialSupportPresentationDialogComponent },
    { path: "commercial-support-gathering-dialog", component: CommercialSupportGatheringComponent },
    { path: "LabTests", component: LabTestsComponent },
    { path: "cpr-newbord-dashborad", component: CprNewbordDashboradComponent },
    { path: "cpr-newborn-form", component: CprNewbornFormComponent },
    { path: "LabTests", component: LabTestsComponent },
    { path: "hospital-cath-dashb", component: GoogleChartsComponent },
    { path: "hospital-roomtime-dashb", component: RoomTimeDashboardComponent },
    { path: "hospital-roomtimen-dashb", component: RoomTimeNDashboardComponent },
    { path: "hospital-roomtimert-dashb", component: RoomTimeRTDashboardComponent },
    { path: "hospital-roomtimert-mdashb", component: RoomTimeRTmDashboardComponent },
    { path: 'service-unit-email-list', component: ServiceUnitEmailListComponent },
    { path: 'service-unit-email-list-dialog', component: ServiceUnitEmailListDialogComponent },
    { path: "hospitalincomedashb", component: HospitalIncomeDashbComponent },
    { path: "hospital-income-dashb", component: GoogleChartsIncomeComponent },
    { path: "hospitalincomenbdashb", component: HospitalIncomeNBDashbComponent },
    { path: "hospital-roomtimert-dashb", component: HospitalRoomTimeRTDashbComponent },
    { path: "hospital-incomenb-dashb", component: GoogleChartsIncomeNBComponent },
    { path: "folders-management", component: FoldersManagementComponent },
    { path: "folders-dialog", component: FolderDialogComponent },
    
];


@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule],
    providers: [{ provide: LocationStrategy, useClass: HashLocationStrategy }],
    declarations: [],
})
export class AppRoutingModule { }
