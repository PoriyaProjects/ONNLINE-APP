using Newtonsoft.Json;
using System;
using System.Activities.Expressions;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;

public class GetSurgeriesRealTimeRoomsByDateEx
{
    public static string changeRate;

    // NAMER (נמר) - מתחברים רק אליו, והוא ניגש לקמליון דרך Linked Server
    private readonly string connetionStringNAMER =
        "Data Source=SRV-APPDB;Initial Catalog=NAMER;User ID=hrd;Password=3*MFydzDx4%@#AS;";

    // Linked Server name (כמו שהגדרתם ב-SQL Server בנמר)
    private const string CHAMELEON_LINKED_SERVER = "SRV-CP-DB-3";
    private const string CHAMELEON_DB = "Chameleon";
    // טבלאות בקמליון
    private const string TBL_SignaturesInSheet = "SignaturesInSheet";
    private const string TBL_MedicalRecords = "MedicalRecords";

    private static string AsString(object v)
    {
        return (v == null || v == DBNull.Value) ? null : v.ToString();
    }

    private static int AsInt(object v)
    {
        if (v == null || v == DBNull.Value) return 0;
        int n;
        return int.TryParse(v.ToString(), out n) ? n : 0;
    }

    private static long AsLong(object v)
    {
        if (v == null || v == DBNull.Value) return 0;
        long n;
        return long.TryParse(v.ToString(), out n) ? n : 0;
    }

    private static string AsDateYMD(object v)
    {
        if (v == null || v == DBNull.Value) return null;

        if (v is DateTime)
            return ((DateTime)v).ToString("yyyy-MM-dd");

        DateTime d;
        if (DateTime.TryParse(v.ToString(), out d))
            return d.ToString("yyyy-MM-dd");

        return null;
    }

    private static string AsTimeHM(object v)
    {
        if (v == null || v == DBNull.Value) return null;

        if (v is TimeSpan)
            return ((TimeSpan)v).ToString(@"hh\:mm");

        if (v is DateTime)
            return ((DateTime)v).ToString("HH:mm");

        TimeSpan t;
        if (TimeSpan.TryParse(v.ToString(), out t))
            return t.ToString(@"hh\:mm");

        DateTime d;
        if (DateTime.TryParse(v.ToString(), out d))
            return d.ToString("HH:mm");

        return null;
    }

    private static long ParseCaseNumberToAdmissionNo(string caseNumber)
    {
        if (string.IsNullOrEmpty(caseNumber)) return 0;

        char[] buf = new char[caseNumber.Length];
        int k = 0;
        for (int i = 0; i < caseNumber.Length; i++)
        {
            char c = caseNumber[i];
            if (c >= '0' && c <= '9') buf[k++] = c;
        }
        if (k == 0) return 0;

        string digits = new string(buf, 0, k);

        long n;
        if (long.TryParse(digits, out n)) return n;
        return 0;
    }

    private class SigInfo
    {
        public int ReadyForSurgery;
        public string MissingSignatures;
        public string SignatureByRoleJson;
    }

    // קמיליון דרך Linked Server, אבל מריצים את השאילתה דרך החיבור לנמר
    private Dictionary<long, SigInfo> LoadSignaturesForDay(DateTime targetDate)
    {
        Dictionary<long, SigInfo> map = new Dictionary<long, SigInfo>();

        string sigQuery =
@"DECLARE @date date = @dateParam;

;WITH raw AS (
    SELECT
        TRY_CONVERT(bigint, mr.Admission_No) AS AdmissionNoBig,
        a.Duty,
        a.Entry_User,
        a.Entry_Date
    FROM [" + CHAMELEON_LINKED_SERVER + @"].[" + CHAMELEON_DB + @"].[dbo].[" + TBL_SignaturesInSheet + @"] a
    JOIN [" + CHAMELEON_LINKED_SERVER + @"].[" + CHAMELEON_DB + @"].[dbo].[" + TBL_MedicalRecords + @"] mr
      ON mr.Medical_Record = a.Medical_Record
    WHERE a.Delete_Date IS NULL
      AND a.Entry_Date >= @date
      AND a.Entry_Date < DATEADD(day, 1, @date)
      AND a.Duty IN (168,240,241,113)
      AND TRY_CONVERT(bigint, mr.Admission_No) IS NOT NULL
),
agg AS (
    SELECT
        AdmissionNoBig,
        MAX(CASE WHEN Duty = 168 THEN 1 ELSE 0 END) AS HasSurgeon,
        MAX(CASE WHEN Duty = 240 THEN 1 ELSE 0 END) AS HasReceptionNurse,
        MAX(CASE WHEN Duty = 241 THEN 1 ELSE 0 END) AS HasORNurse,
        MAX(CASE WHEN Duty = 113 THEN 1 ELSE 0 END) AS HasAnesth,

        MAX(CASE WHEN Duty = 168 THEN CAST(Entry_User as nvarchar(50)) ELSE NULL END) AS SurgeonSignedBy,
        MAX(CASE WHEN Duty = 240 THEN CAST(Entry_User as nvarchar(50)) ELSE NULL END) AS ReceptionSignedBy,
        MAX(CASE WHEN Duty = 241 THEN CAST(Entry_User as nvarchar(50)) ELSE NULL END) AS ORSignedBy,
        MAX(CASE WHEN Duty = 113 THEN CAST(Entry_User as nvarchar(50)) ELSE NULL END) AS AnesthSignedBy
    FROM raw
    GROUP BY AdmissionNoBig
)
SELECT
    AdmissionNoBig,
    CASE WHEN HasSurgeon=1 AND HasReceptionNurse=1 AND HasORNurse=1 AND HasAnesth=1 THEN 1 ELSE 0 END AS ReadyForSurgery,
    NULLIF(
        STUFF(
            (CASE WHEN HasSurgeon=0 THEN N', רופא מנתח' ELSE N'' END) +
            (CASE WHEN HasReceptionNurse=0 THEN N', אח/ות קבלה' ELSE N'' END) +
            (CASE WHEN HasORNurse=0 THEN N', אח/ות חדר ניתוח' ELSE N'' END) +
            (CASE WHEN HasAnesth=0 THEN N', רופא מרדים' ELSE N'' END)
        , 1, 2, N'')
    , N'') AS MissingSignatures,
    (
      SELECT
        SurgeonSignedBy   AS SurgeonSignedBy,
        ReceptionSignedBy AS ReceptionSignedBy,
        ORSignedBy        AS ORSignedBy,
        AnesthSignedBy    AS AnesthSignedBy
      FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS SignatureByRoleJson
FROM agg;";

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            cnn.Open();
            using (SqlCommand cmd = new SqlCommand(sigQuery, cnn))
            {
                cmd.Parameters.Add("@dateParam", SqlDbType.Date).Value = targetDate.Date;

                using (SqlDataReader r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        long admissionNo = AsLong(r["AdmissionNoBig"]);
                        if (admissionNo == 0) continue;

                        SigInfo si = new SigInfo();
                        si.ReadyForSurgery = AsInt(r["ReadyForSurgery"]);
                        si.MissingSignatures = AsString(r["MissingSignatures"]);
                        si.SignatureByRoleJson = AsString(r["SignatureByRoleJson"]);

                        map[admissionNo] = si;
                    }
                }
            }
        }

        return map;
    }

    private sealed class ChameleonSurgeryInfo
    {
        public string SurgeryDepartment { get; set; }
        public DateTime? RoomEntranceTime { get; set; }
        public DateTime? AnesthesiaStartTime { get; set; }
        public DateTime? SurgeryStartTime { get; set; }
        public DateTime? SurgeryEndTime { get; set; }
        public DateTime? AnesthesiaEndTime { get; set; }
        public DateTime? RoomExitTime { get; set; }
        public string CanceledInRoom { get; set; }
    }

    private Dictionary<long, ChameleonSurgeryInfo> LoadChameleonSurgeryInfoForDay(DateTime targetDate)
    {
        var map = new Dictionary<long, ChameleonSurgeryInfo>();

        string query = @"
;WITH base AS (
    SELECT
        TRY_CONVERT(BIGINT, mr.Admission_No) AS AdmissionNoBig,
        e.Medical_Record,
        e.Parameter,
        e.Execution_Date,
        ve.ComboText
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[Execution] e
    INNER JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] mr
        ON mr.Medical_Record = e.Medical_Record
    LEFT JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[V_Execution] ve
        ON ve.Row_ID = e.Row_ID
    WHERE e.Delete_Date IS NULL
      AND e.Execution_Date >= @date
      AND e.Execution_Date < DATEADD(DAY, 1, @date)
      AND e.Parameter IN (12798, 5433, 5437, 5434, 5435, 5436, 5438)
      AND TRY_CONVERT(BIGINT, mr.Admission_No) IS NOT NULL
),
agg AS (
    SELECT
        AdmissionNoBig,
        MAX(CASE WHEN Parameter = 12798 THEN ComboText END) AS SurgeryDepartment,
        MIN(CASE WHEN Parameter = 5437 THEN Execution_Date END) AS RoomEntranceTime,
        MIN(CASE WHEN Parameter = 5433 THEN Execution_Date END) AS AnesthesiaStartTime,
        MIN(CASE WHEN Parameter = 5434 THEN Execution_Date END) AS SurgeryStartTime,
        MAX(CASE WHEN Parameter = 5435 THEN Execution_Date END) AS SurgeryEndTime,
        MAX(CASE WHEN Parameter = 5436 THEN Execution_Date END) AS AnesthesiaEndTime,
        MAX(CASE WHEN Parameter = 5438 THEN Execution_Date END) AS RoomExitTime
    FROM base
    GROUP BY AdmissionNoBig
)
SELECT
    AdmissionNoBig,
    SurgeryDepartment,
    RoomEntranceTime,
    AnesthesiaStartTime,
    SurgeryStartTime,
    SurgeryEndTime,
    AnesthesiaEndTime,
    RoomExitTime
FROM agg;";

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            cnn.Open();
            using (SqlCommand cmd = new SqlCommand(query, cnn))
            {
                cmd.Parameters.Add("@date", SqlDbType.Date).Value = targetDate.Date;

                using (SqlDataReader r = cmd.ExecuteReader())
                {
                    while (r.Read())
                    {
                        long admissionNo = AsLong(r["AdmissionNoBig"]);
                        if (admissionNo == 0) continue;

                        map[admissionNo] = new ChameleonSurgeryInfo
                        {
                            SurgeryDepartment = AsString(r["SurgeryDepartment"]),
                            RoomEntranceTime = r["RoomEntranceTime"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["RoomEntranceTime"]),
                            AnesthesiaStartTime = r["AnesthesiaStartTime"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["AnesthesiaStartTime"]),
                            SurgeryStartTime = r["SurgeryStartTime"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["SurgeryStartTime"]),
                            SurgeryEndTime = r["SurgeryEndTime"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["SurgeryEndTime"]),
                            AnesthesiaEndTime = r["AnesthesiaEndTime"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["AnesthesiaEndTime"]),
                            RoomExitTime = r["RoomExitTime"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["RoomExitTime"])
                        };
                    }
                }
            }
        }

        return map;
    }

    public string GetSurgeryRoomsByDateEx(string date = null)
    {
        DateTime targetDate;
        if (!DateTime.TryParse(date, out targetDate))
            targetDate = DateTime.Today;

        Dictionary<long, SigInfo> sigByAdmissionNo = LoadSignaturesForDay(targetDate);
        Dictionary<long, ChameleonSurgeryInfo> chameleonByAdmissionNo = LoadChameleonSurgeryInfoForDay(targetDate);

        List<object> surgeries = new List<object>();

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            cnn.Open();

            const string query = @"
SELECT
    a.PM_CASE_NUMBER,
    b.SurgeryRoomDetails,
    CONCAT(sr.RoomGroupDesc,' - ',sr.SurgeryRoomDesc) AS SurgeryRoomName,
    FORMAT(b.[ArrivalDate], 'yyyy-MM-dd') AS [ArrivalDate],
    CONVERT(VARCHAR(5), b.[ArrivalTime], 108) AS [ArrivalTime],
    CONVERT(VARCHAR(5), b.[EndTime], 108) AS [EndTime],
    CASE WHEN CONCAT(nu.UserFirstName,' ',nu.UserLastName) = '' THEN b.[SurgeonDoctor] 
         ELSE CONCAT(nu.UserFirstName,' ',nu.UserLastName) END AS [SurgeonDoctor],
    b.[SurgeryStatus],
    b.[SurgeryType],
    b.[WithAnesthesia],
    b.[Urgency],
    b.[Duration],
    b.[NOTE],
    b.SurgeryID,
    b.[NoteType],
    b.[NoteTypeRequest],
    b.[SurgeryTypeReasonRequest],
    b.[SurgeryTypeReason],
    b.[SurgeryReasonNoteRequest],
    b.[SurgeryReasonNote],
    b.[BLOOD_BANK],
    b.AvgDauration,
    b.Row_ID,
b.CanceledInRoom,
    b.[RequestedDepartmentDetails],
    rt.TimeEntranceToTheOperatingRoom AS RealStartTime,
    rt.TimeExitingTheOperatingRoom AS RealEndTime,
    rt.PatientNumber,
    STUFF((
        SELECT N', ' + s.Surgery_Name
        FROM [NAMER].[dbo].[SurgeriesCalendar_Surgeries] AS s WITH (NOLOCK)
        WHERE s.SurgeriesCalendarIDFK = b.Row_ID
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 2, N'') AS SurgeryName,
    STUFF((
        SELECT N', ' + s.Surgery_Code
        FROM [NAMER].[dbo].[SurgeriesCalendar_Surgeries] AS s WITH (NOLOCK)
        WHERE s.SurgeriesCalendarIDFK = b.Row_ID
        FOR XML PATH(''), TYPE
    ).value('.', 'nvarchar(max)'), 1, 2, N'') AS SurgeryCode,
    (SELECT MAX(s.DrorDuration) FROM [NAMER].[dbo].[SurgeriesCalendar_Surgeries] AS s WITH (NOLOCK) WHERE s.SurgeriesCalendarIDFK = b.Row_ID) AS DrorDuration,
    TRY_CONVERT(int, RIGHT(b.SurgeryRoomDetails, 1)) AS RoomNumberSort
FROM [NAMER].[dbo].[SurgeriesCalendarPatients] AS a WITH (NOLOCK)
INNER JOIN [NAMER].[dbo].[SurgeriesCalendar] AS b WITH (NOLOCK)
    ON a.SurgeriesCalendarIDFK = b.Row_ID
LEFT JOIN [NAMER].[dbo].[SurgeriesRoomDesc] AS sr WITH (NOLOCK)
    ON b.SurgeryRoomDetails = sr.SurgeryRoom
LEFT JOIN [NAMER].[dbo].[NAMER_USERS] AS nu WITH (NOLOCK)
    ON b.SurgeonDoctor = nu.VMA 
    AND nu.StatusDescription = N'לא נעול' 
    AND nu.VMA <> ''
LEFT JOIN [NAMER].[dbo].[SurgeriesRealTime] AS rt WITH (NOLOCK)
    ON b.SurgeryID = rt.SurgeryID
WHERE b.ArrivalDate >= @date
  AND b.ArrivalDate < DATEADD(DAY, 1, @date)

  AND ISNULL(b.SurgeryRoomDetails, N'') <> N''
  AND b.SurgeryRoomDetails NOT LIKE N'%ור%'
  AND b.SurgeryID IS NOT NULL
  AND LEN(b.SurgeryID) > 0
ORDER BY RoomNumberSort, b.ArrivalTime;";

            using (SqlCommand cmd = new SqlCommand(query, cnn))
            {
                cmd.Parameters.Add("@date", SqlDbType.Date).Value = targetDate.Date;

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string caseNumber = AsString(reader["PM_CASE_NUMBER"]);
                        long admissionNo = ParseCaseNumberToAdmissionNo(caseNumber);

                        SigInfo sig = null;
                        if (admissionNo != 0)
                            sigByAdmissionNo.TryGetValue(admissionNo, out sig);

                        ChameleonSurgeryInfo cham = null;
                        if (admissionNo != 0)
                            chameleonByAdmissionNo.TryGetValue(admissionNo, out cham);

                        string surgeryStatus = AsString(reader["SurgeryStatus"]);
                        bool isWaitingForSurgery = (surgeryStatus == "Planned");

                        int ready = (sig != null) ? sig.ReadyForSurgery : 0;
                        string missing = (sig != null) ? sig.MissingSignatures : null;

                        bool nextPatientReadyGreen = isWaitingForSurgery && (ready == 1);
                        string missingSignaturesText = isWaitingForSurgery ? missing : null;

                        string realStart = AsTimeHM(reader["RealStartTime"]);
                        string realEnd = AsTimeHM(reader["RealEndTime"]);

                        if (string.IsNullOrWhiteSpace(realStart)
      && cham != null
      && cham.RoomEntranceTime != null)
                        {
                            realStart = cham.RoomEntranceTime.Value.ToString("HH:mm");
                        }

                        if (string.IsNullOrWhiteSpace(realEnd)
                            && cham != null
                            && cham.RoomExitTime != null)
                        {
                            realEnd = cham.RoomExitTime.Value.ToString("HH:mm");
                        }

                        surgeries.Add(new
                        {
                            SurgeryID = AsString(reader["SurgeryID"]),
                            SurgeryRoom = AsString(reader["SurgeryRoomDetails"]),
                            SurgeryRoomName = AsString(reader["SurgeryRoomName"]),
                            SurgeryDate = AsString(reader["ArrivalDate"]),

                            TimeEntranceToTheOperatingRoom = realStart,
                            TimeExitingTheOperatingRoom = realEnd,

                            CaseNumber = caseNumber,
                            AdmissionNo = admissionNo,

                            PatientNumber = AsString(reader["PatientNumber"]),

                            DepartName = AsString(reader["RequestedDepartmentDetails"]),
                            SurgeryDepartment = cham != null ? cham.SurgeryDepartment : null,

                            SurgeryName = AsString(reader["SurgeryName"]),
                            SurgeryCode = AsString(reader["SurgeryCode"]),
                            DepartNameDoing = cham != null ? cham.SurgeryDepartment : null,
                            SurgeryPrimary = (string)null,
                            SurgeryStatus = surgeryStatus,
                            TimeSurgeryToDo = AsString(reader["Duration"]),
                            NoteOrRoomNumber = AsString(reader["NOTE"]),
                            SurgeryType = AsString(reader["SurgeryType"]),
                            Urgency = AsString(reader["Urgency"]),

                            ReadyForSurgery = ready,
                            MissingSignatures = missing,
                            SignatureByRole = (sig != null) ? sig.SignatureByRoleJson : (string)null,

                            IsWaitingForSurgery = isWaitingForSurgery,
                            NextPatientReadyGreen = nextPatientReadyGreen,
                            DoctorSurgeon = AsString(reader["SurgeonDoctor"]),
                            AvgDuration = AsString(reader["AvgDauration"]),
                            MissingSignaturesText = missingSignaturesText,

                            Row_ID = AsString(reader["Row_ID"]),
                            ArrivalTime = AsString(reader["ArrivalTime"]),
                            EndTime = AsString(reader["EndTime"]),
                            WithAnesthesia = AsString(reader["WithAnesthesia"]),
                            NoteType = AsString(reader["NoteType"]),
                            NoteTypeRequest = AsString(reader["NoteTypeRequest"]),
                            SurgeryTypeReasonRequest = AsString(reader["SurgeryTypeReasonRequest"]),
                            SurgeryTypeReason = AsString(reader["SurgeryTypeReason"]),
                            SurgeryReasonNoteRequest = AsString(reader["SurgeryReasonNoteRequest"]),
                            SurgeryReasonNote = AsString(reader["SurgeryReasonNote"]),
                             CanceledInRoom = AsString(reader["CanceledInRoom"])    ,
                        BLOOD_BANK = AsString(reader["BLOOD_BANK"])
                        });
                    }
                }
            }
        }

        var result = new
        {
            date = targetDate.ToString("yyyy-MM-dd"),
            surgeries = surgeries
        };

        return JsonConvert.SerializeObject(result);
    }
}