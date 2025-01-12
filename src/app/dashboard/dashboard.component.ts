import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "src/environments/environment";
const { GoogleGenerativeAI } = require("@google/generative-ai");
import { DomSanitizer } from '@angular/platform-browser';


export interface DepartRefoee {
    DepartName: string;
    DepartBedsNumber: number;
    DepartBedsInUsed: number;
    DepartBedsInUsedPer: number;
    Moshamem: number;
}
@Component({
    selector: "app-dashboard",
    templateUrl: "./dashboard.component.html",
    styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
    clinicactivitydashboard = "#/clinicactivitydashboard";
    folders_display = [];
    shortcuts = [];
    folders = [];
    first_name: string;
    last_name: string;
    full_date: string;
    employee_id: string;
    ProfilePicture: string;
    claude_version_list = [];
    claude_version: any = '';
    birth_day_people = [];
    question: string = '';
    answer: string | null = null;
    userName = localStorage.getItem("loginUserName").toLowerCase();
    firstName = localStorage.getItem("FirstName").toLowerCase();
    lastName = localStorage.getItem("LastName").toLowerCase();
    functionDescription = localStorage.getItem("FunctionDescription").toLowerCase();
    birthdayUser: boolean = false;
    constructor(
        private router: Router,
        private sanitizer: DomSanitizer,
        private http: HttpClient
    ) { }
    today: number = Date.now();
    _dotsLoader =
        '<div class="spinner">' +
        '<div class="bounce1"></div>' +
        '<div class="bounce2"></div>' +
        '<div class="bounce3"></div>' +
        "</div>";
    ngOnInit() {
        $("#Vector_13").append('text').text('This is some information about whatever')
            .attr('x', 50)
            .attr('y', 150)
            .attr('fill', '#938F8F');

        this.getLoginUserDetails();
        this.getBirthDayPeople();
        this.getShortCutsLinks();
        this.getFoldersLinks();
        this.getAWSClaudeConfiguration();
    }

    formatAnswer(text: string): string {
        text = text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        text = text.replace(/\n/g, '<br>');
        return text;
    }

    chooseAiModelToAsk(model) {
        this.claude_version = model;
    }

    get safeAnswer() {
        return this.sanitizer.bypassSecurityTrustHtml(this.formatAnswer(this.answer));
    }

    async askModel() {
        if (this.question == '') {
            this.answer = 'לצורך קבלת מענה, יש להזין את השאלה בשדה המיועד לכך למעלה.';
            return;
        }
        if (this.claude_version.model_identify == 'Gemeni') this.askGemini(this.claude_version);
        else if (this.claude_version.model_identify == 'Claude') await this.askClaude(this.claude_version);
    }

    async askGemini(model) {
        this.answer = '';
        if (this.question == '') {
            this.answer = 'לצורך קבלת מענה, יש להזין את השאלה בשדה המיועד לכך למעלה.';
            return;
        }
        // Simulate an AI response. Replace this with an actual API call to your backend/AI service.
        let prefix = ``;
        this.answer = await this.runChat(model, this.question);
        // this.answer = this.sanitizer.bypassSecurityTrustHtml(this.formatAnswer(this.answer));
        let name = this.firstName + ' ' + this.lastName;
        let content = 'שאל: ' + this.question;
        if (this.userName != 'adahabre') this.sendNotificationToWhatsApp(name, content);
    }

    async runChat(model, question) {
        const genAI = new GoogleGenerativeAI(model.aws_secret_access_key);
        const gen_model = genAI.getGenerativeModel({ model: model.modelId });
        const result = await gen_model.generateContent(question);

        const response = result.response;
        return response.text();
    }

    async askClaude(model) {
        model['prompt'] = this.question;
        try {
            this.http
                .post("http://srv-apps-prod:5769/api/BedrockModel/InvokeModel", {
                    config: model
                })
                .subscribe((Response) => {
                    try {
                        console.log(Response);
                        this.answer = Response['Message'];
                    } catch (error) {
                        console.log("error in sending notification!");
                    }
                });
            // let name = this.firstName + ' ' + this.lastName;
            // let content = 'שאל: ' + prompt;
            // if (this.userName != 'adahabre') this.sendNotificationToWhatsApp(name, content);
        } catch (error) {
            console.error("Error invoking the model:", error);
            throw error;
        }
    }

    openFileInTab(link: string) {
        if (link == '') return;
        window.open(link, "_blank");
    }

    sendNotificationToWhatsApp(name, content) {
        this.http
            .post(environment.url + "SendNotificationToWhatsApp", {
                name: name,
                content: content
            })
            .subscribe((Response) => {
                try {
                    console.log("Success Ask!");
                } catch (error) {
                    console.log("error in sending notification!");
                }
            });
    }

    userClickedProfilePicture(person) {
        console.log(person);
        let user_name = this.firstName + ' ' + this.lastName;
        let content = 'לחץ על תמונת: ' + person.FirstName + ' ' + person.LastName;
        this.sendNotificationToWhatsApp(user_name, content);
    }

    getAWSClaudeConfiguration() {
        this.http
            .post(environment.url + "GetAWSClaudeConfiguration", {})
            .subscribe((Response) => {
                try {
                    this.claude_version_list = Response['d'];
                } catch (error) {
                    console.log("error in claude list");
                }
            });
    }

    getBirthDayPeople() {
        this.http
            .post(environment.url + "GetBirthDayPeople", {
                user_name: this.userName
            })
            .subscribe((Response) => {
                try {
                    this.birth_day_people = Response['d'];
                } catch (error) {
                    console.log("error in birthday list");
                }
            });
    }

    getShortCutsLinks() {
        this.http
            .post(environment.url + "GetShortCutsLinks", {
                _userName: this.userName
            })
            .subscribe((Response) => {
                try {
                    this.shortcuts = Response['d'];
                } catch (error) {
                    console.log("error in birthday list");
                }
            });
    }

    getFoldersLinks() {
        this.http
            .post(environment.url + "GetFoldersLinks", {
                _userName: this.userName
            })
            .subscribe((Response) => {
                try {
                    this.folders = Response['d'];
                    this.folders_display = this.folders.filter(x => x.Parent == "0");
                } catch (error) {
                    console.log("error in birthday list");
                }
            });
    }

    openWithEdge2(link: string) {
        window.open("microsoft-edge:" + link);
    }

    getLoginUserDetails() {
        this.http
            .post(environment.url + "GetLoginUserDetails", {
                _userName: this.userName
            })
            .subscribe((Response) => {
                let user = Response["d"];
                try {
                    this.employee_id = user.EmployeeID;
                    this.ProfilePicture = user.ProfilePicture;
                    this.first_name = user.FirstName;
                    this.last_name = user.LastName;
                    this.full_date = user.FullBirthDate;
                    let currentDate = new Date();
                    let day = user.DateOfBirth.split("-")[1];
                    let month = user.DateOfBirth.split("-")[0];
                    if (parseInt(day) == currentDate.getDate() && parseInt(month) == (currentDate.getMonth() + 1)) {
                        this.birthdayUser = true;
                    }
                } catch (error) {
                    console.log("error in birthday");
                }

            });
    }

    getEmployeeImage(employee_id) {
        const img = `http://srv-apps-prod/Images/${employee_id}.jpg`;
        return img;
    }

    openFolder() {
        let link = "\\\\srv-apps-02\\bin2\\פרוטוקולים לטיפול אנטיביוטי אמפירי";
        window.location.href = link;
        // window.open("", "_blank");
    }
}
