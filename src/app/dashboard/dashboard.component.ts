import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from "src/environments/environment";
const { GoogleGenerativeAI } = require("@google/generative-ai");
import { DomSanitizer } from '@angular/platform-browser';
import { MatDialog } from "@angular/material/dialog";
import { NamerUserActionsComponent } from "./namer-user-actions/namer-user-actions.component";


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
    shortcutstabs = [];
    mainshortcuts = [];
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
    thinking: boolean = false;
    righttabs = [];
    lefttabs = [];
    requestid = 0;
    responseid = 0;
    feedbacksubmited: boolean;
    searchTerm = '';
    Links: any[] = [];
    filteredList: any[] = [...this.Links];
    private geminiChats: Map<string, any> = new Map();

    // Track selected tab index
    selectedTabIndex: number | null = 0;


    constructor(
        private router: Router,
        private dialog: MatDialog,
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

        this.getMenuLinks();
        this.getLoginUserDetails();
        this.getBirthDayPeople();
        this.getShortCutsLinks();
        this.getFoldersLinks();
        this.getAWSClaudeConfiguration();
    }

    // Method to select a tab
    selectTab(index: number): void {
        this.selectedTabIndex = index;
    }

    filterOptions() {
        const val = this.searchTerm.toLowerCase();
        this.filteredList = this.Links.filter(option =>
            option.LinkDescription.toLowerCase().includes(val)
        );
    }

    clearSearch() {
        this.searchTerm = '';
        this.filteredList = [...this.Links];
    }

    onOptionSelected(url: string) {
        
        //if(url.indexOf("onnlinereorts") > 0){
            let t = url.split('/')[url.split('/').length - 1]
           // debugger
            this.http.post(
                environment.url + "LinksLog",
                {
                    usaerName: localStorage.getItem("loginUserName"),
                    linkId: t ,
                }
            )
            .subscribe((Response) => { });
        //}
        this.clearSearch();
        window.open(url, '_blank');
        // window.location.href = url;
    }

    getMenuLinks() {
        this.http
            .post(
                environment.url + "GetOnnLineLinksToSearch",
                {
                    user: localStorage.getItem("loginUserName"),
                }
            )
            .subscribe((Response) => {
                this.Links = Response["d"];
            });
    }

    openModal(): void {
        const dialogRef = this.dialog.open(NamerUserActionsComponent, {
            width: '400px',
            data: {} // You can pass additional data here if needed
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                console.log('Input Value:', result); // Handle the returned data
            } else {
                console.log('Modal closed without input');
            }
        });
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
        if (this.question.trim() == '') {
            this.answer = 'לצורך קבלת מענה, יש להזין את השאלה בשדה המיועד לכך למעלה.';
            return;
        }
        if (this.userName === 'nibrahem') return;

        if (this.claude_version.model_identify === 'Gemeni') {
            await this.askGemini(this.claude_version);
        } else if (this.claude_version.model_identify === 'Claude') {
            await this.askClaude(this.claude_version);
        }
    }

    async askGemini(model) {
        this.thinking = true;
        this.answer = '';

        const resp = await this.runChat(model, this.userName, this.question);
        this.answer = resp.text();
        this.AskAIRequestData(this.userName, resp.modelVersion, this.question);

        this.thinking = false;
    }

    async runChat(model, username: string, question: string) {
        const genAI = new GoogleGenerativeAI(model.aws_secret_access_key);
        const gen_model = genAI.getGenerativeModel({ model: model.modelId });

        // Check if user already has a chat session
        if (!this.geminiChats.has(username)) {
            const chatSession = gen_model.startChat({
                history: [], // fresh chat
            });
            this.geminiChats.set(username, chatSession);
        }

        const chat = this.geminiChats.get(username);
        const result = await chat.sendMessage(question);

        return result.response;
    }

    async askClaude(model: any) {
        this.thinking = true;
        // Transform the payload to the new structure
        const updatedModel = {
            Region_Name: model.region_name,
            AWS_Access_Key_ID: model.aws_access_key_id,
            AWS_Secret_Access_Key: model.aws_secret_access_key,
            ModelId: model.modelId,
            Max_Tokens: model.max_tokens,
            Prompt: this.question,
        };

        try {
            this.http
                .post("http://srv-apps-prod:5769/api/BedrockModel/InvokeModel", updatedModel)
                .subscribe((response: any) => {
                    try {
                        if (response && typeof response['Responses'] === 'string') {
                            const parsedResponse = JSON.parse(response['Responses']);
                            if (parsedResponse && typeof parsedResponse.text === 'string') {
                                this.answer = parsedResponse.text;
                                this.AskAIRequestData(this.userName, model.modelId, this.question);
                                this.thinking = false;
                            } else {
                                console.error('Invalid response format: missing "text" property');
                            }
                        } else {
                            console.error('Invalid response format: missing "Responses" property');
                        }
                    } catch (error) {
                        console.error('Error parsing response:', error);
                    }
                });
        } catch (error) {
            console.error("Error invoking the model:", error);
            throw error;
        }
    }

    AskAIRequestData(user_name, model_id, prompt) {
        this.http
            .post(environment.url + "AskAIRequestData", {
                user_name: user_name,
                model_id: model_id,
                prompt: prompt,
            })
            .subscribe((Response) => {
                try {
                    this.requestid = Response['d'];
                    this.AskAIResponseData(this.userName, model_id, this.answer);
                } catch (error) {
                    console.log("error in AskAIRequestData!");
                }
            });
    }

    AskAIResponseData(user_name, model_id, prompt) {
        this.http
            .post(environment.url + "AskAIResponseData", {
                user_name: user_name,
                model_id: model_id,
                text: prompt,
                id: this.requestid,
            })
            .subscribe((Response) => {
                try {
                    this.responseid = Response['d'];
                } catch (error) {
                    console.log("error in AskAIRequestData!");
                }
            });
    }

    submitFeedback(feedback): void {
        this.http
            .post(environment.url + "AIUserFeedBack", {
                _feedback: feedback,
                _id: this.responseid
            })
            .subscribe((Response) => {
                try {
                    this.feedbacksubmited = true;
                    console.log("saved to db");
                } catch (error) {
                    console.log("error in AskAIRequestData!");
                }
            });
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

    saveClickToDB(content) {
        this.http
            .post(environment.url + "SaveClickToDB", {
                name: this.userName,
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

    userClickedShortCut(shortcut_link) {
        this.saveClickToDB(shortcut_link);
    }

    userClickedProfilePicture(person) {
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
                    this.claude_version = this.claude_version_list[0];
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
                    this.shortcuts = Response['d'].filter(x => x.TabsPlace == "right");
                    this.mainshortcuts = Response['d'].filter(x => x.TabsPlace == "left");
                    this.righttabs = [];
                    this.lefttabs = [];

                    // ======================================== left ===========================================
                    const parentTabMap1 = new Map<string, any[]>();

                    // Group shortcuts by ParentTab
                    this.shortcuts.forEach((shortcut) => {
                        if (!parentTabMap1.has(shortcut.ParentTab)) {
                            parentTabMap1.set(shortcut.ParentTab, []);
                        }
                        parentTabMap1.get(shortcut.ParentTab)?.push(shortcut);
                    });

                    // Transform map into an array of tabs
                    this.righttabs = Array.from(parentTabMap1.entries()).map(([title, cards]) => ({
                        title,
                        cards,
                    }));

                    // ======================================== left ===========================================
                    const parentTabMap2 = new Map<string, any[]>();

                    // Group shortcuts by ParentTab
                    this.mainshortcuts.forEach((shortcut) => {
                        if (!parentTabMap2.has(shortcut.ParentTab)) {
                            parentTabMap2.set(shortcut.ParentTab, []);
                        }
                        parentTabMap2.get(shortcut.ParentTab)?.push(shortcut);
                    });

                    // Transform map into an array of tabs
                    this.lefttabs = Array.from(parentTabMap2.entries()).map(([title, cards]) => ({
                        title,
                        cards,
                    }));
                } catch (error) {
                    console.log("error in ShortCuts list");
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
                    console.log("error in Folders list");
                }
            });
    }

    openWithEdge2(link: string) {
        window.open("microsoft-edge:" + link);
    }

  ifnotebooklm(link: string, event?: Event) {
    if (link == 'notebooklm') {
        event?.preventDefault(); // Prevent link from opening
        
        this.http
            .post(environment.url + "OpenLM", {})
            .subscribe((Response) => {
                console.log(Response);
            });
    }
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
