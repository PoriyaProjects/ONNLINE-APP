import {
    RoomData,
    RoomTimeRTmDashboardComponent,
    Surgery,
} from "./google-charts.component";

describe("room department header", () => {
    const component = Object.create(
        RoomTimeRTmDashboardComponent.prototype,
    ) as RoomTimeRTmDashboardComponent;

    function surgery(overrides: Partial<Surgery>): Surgery {
        return {
            surgeryId: "",
            patientNumber: "",
            surgeryName: "",
            surgeryCode: "",
            department: "אורתופדיה",
            status: "Planned",
            timeEntrance: "",
            timeExit: "",
            surgeryDate: "2000-01-01",
            SurgeryRoom: "1",
            SurgeryDate: "2000-01-01",
            TimeEntranceToTheOperatingRoom: null,
            TimeExitingTheOperatingRoom: null,
            SurgeryStatus: "Planned",
            TimeSurgeryToDo: null,
            DoctorSurgeon: null,
            SurgeryType: null,
            ...overrides,
        };
    }

    function room(surgeries: Surgery[]): RoomData {
        return { roomId: "1", date: "2000-01-01", surgeries };
    }

    it("shows the current surgery rather than a planned or completed surgery", () => {
        const data = room([
            surgery({ status: "Completed", department: "מחלקה אחרת" }),
            surgery({ ArrivalTime: "08:00", SurgeonSubDepartment: "מתוכנן" }),
            surgery({
                status: "InProgress",
                timeEntrance: "09:00",
                SurgeonSubDepartment: "עמוד שדרה",
            }),
        ]);
        expect(component.getRoomDepartment(data)).toBe("אורתופדיה");
        expect(component.getRoomSurgeonSubDepartments(data)).toEqual(["עמוד שדרה"]);
    });

    it("shows only the next planned surgery's department and subdepartment", () => {
        const data = room([
            surgery({ status: "Completed", department: "מחלקה אחרת" }),
            surgery({ ArrivalTime: "10:00", SurgeonSubDepartment: "מאוחר" }),
            surgery({ ArrivalTime: "08:00", SurgeonSubDepartment: "עמוד שדרה" }),
        ]);
        expect(component.getRoomDepartment(data)).toBe("אורתופדיה");
        expect(component.getRoomSurgeonSubDepartments(data)).toEqual(["עמוד שדרה"]);
    });

    it("chooses the next surgery when the previous in-progress record has an exit", () => {
        const data = room([
            surgery({
                status: "InProgress",
                timeEntrance: "09:00",
                TimeExitingTheOperatingRoom: "10:00",
                SurgeonSubDepartment: "ישן",
            }),
            surgery({ ArrivalTime: "08:00", SurgeonSubDepartment: "הבא" }),
        ]);
        expect(component.getRoomSurgeonSubDepartments(data)).toEqual(["הבא"]);
    });

    it("does not substitute another surgery's subdepartment when the selected one has none", () => {
        const data = room([
            surgery({ ArrivalTime: "08:00" }),
            surgery({ ArrivalTime: "10:00", SurgeonSubDepartment: "מאוחר" }),
        ]);
        expect(component.getRoomSurgeonSubDepartments(data)).toEqual([]);
    });
});
