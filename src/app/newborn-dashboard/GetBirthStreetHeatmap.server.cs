// =============================================================================
// דשבורד לידות — מפת חום לפי רחוב. להעתקה לשרת, בלי סיסמה ובלי משתנה סביבה.
// =============================================================================
//
// שלב 1 — שומרים את הקובץ הזה כ:
//   App_Code/BirthStreetHeatmap.cs
// (המחלקות BirthStreetHeatRow ו-BirthStreetHeatmap כבר מוכנות להרצה.)
//
// שלב 2 — בתוך class WebService מדביקים רק את הבלוק הזה:
//
// [System.Web.Services.WebMethod]
// [System.Web.Script.Services.ScriptMethod(ResponseFormat = System.Web.Script.Services.ResponseFormat.Json)]
// public List<BirthStreetHeatRow> GetBirthStreetHeatmap(string startDate, string endDate, int year, int month, string yishuv)
// {
//     return BirthStreetHeatmap.Query(connetionStringNAMER, startDate, endDate, year, month, yishuv);
// }
//
// קריאה מהAngular:
//   POST {urlipracticom}GetBirthStreetHeatmap
//   { startDate, endDate, year, month, yishuv }
//   year / month = 0 משמעו הכל. התשובה ב-d כמו שאר ה-ASMX.
//
// עמודות שחוזרות: Kind, City, Street, PostCode, PatientId, EventDate,
// PregnancyWeek, ValidStreet, CountByStreetKind, StreetPotential, MissPercent.
// =============================================================================

using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;

public class BirthStreetHeatRow
{
    public string Kind { get; set; }
    public string City { get; set; }
    public string Street { get; set; }
    public string PostCode { get; set; }
    public string PatientId { get; set; }
    public string EventDate { get; set; }
    public string PregnancyWeek { get; set; }
    public int ValidStreet { get; set; }
    public int CountByStreetKind { get; set; }
    public int StreetPotential { get; set; }
    public decimal MissPercent { get; set; }
}

public static class BirthStreetHeatmap
{
    public static List<BirthStreetHeatRow> Query(string connectionString, string startDate, string endDate, int year, int month, string yishuv)
    {
        DateTime start;
        DateTime end;
        if (!DateTime.TryParse(startDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out start)
            && !DateTime.TryParse(startDate, out start))
        {
            start = new DateTime(2025, 1, 1);
        }
        if (!DateTime.TryParse(endDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out end)
            && !DateTime.TryParse(endDate, out end))
        {
            end = new DateTime(2027, 1, 1);
        }
        start = start.Date;
        end = end.Date;
        if (end <= start) end = start.AddYears(2);
        if (string.IsNullOrEmpty(yishuv)) yishuv = "";

        List<BirthStreetHeatRow> rows = new List<BirthStreetHeatRow>();
        using (SqlConnection cnn = new SqlConnection(connectionString))
        {
            cnn.Open();
            try
            {
                using (SqlCommand cmd = new SqlCommand(Sql, cnn))
                {
                    cmd.CommandTimeout = 180;
                    cmd.Parameters.Add("@StartDate", SqlDbType.Date).Value = start;
                    cmd.Parameters.Add("@EndDate", SqlDbType.Date).Value = end;
                    cmd.Parameters.Add("@Yishuv", SqlDbType.NVarChar, 100).Value = yishuv.Trim();
                    cmd.Parameters.Add("@Year", SqlDbType.Int).Value = year;
                    cmd.Parameters.Add("@Month", SqlDbType.Int).Value = month;
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            rows.Add(Read(reader));
                        }
                    }
                }
            }
            finally
            {
                using (SqlCommand drop = new SqlCommand("IF OBJECT_ID('tempdb..#Ch') IS NOT NULL DROP TABLE #Ch;", cnn))
                {
                    if (cnn.State == ConnectionState.Open) drop.ExecuteNonQuery();
                }
            }
        }
        return rows;
    }

    private const string Sql = @"
IF OBJECT_ID('tempdb..#Ch') IS NOT NULL DROP TABLE #Ch;

SELECT '00' + md.Admission_No AS CaseNumber,
       MAX(vbp.Pregnancy_Age_Calculated) AS Pregnancy_Age_Calculated
INTO #Ch
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] md WITH (NOLOCK)
INNER JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[V_Birth_Pregnancy_Print] vbp WITH (NOLOCK)
    ON md.Medical_Record = vbp.Medical_Record AND vbp.Delete_Date IS NULL
WHERE vbp.Pregnancy_Age_Calculated IS NOT NULL
GROUP BY md.Admission_No;

CREATE INDEX IX_Ch ON #Ch (CaseNumber);

DECLARE @MinWeek INT = 20;
DECLARE @GraceDays INT = 14;

;WITH Addr AS (
    SELECT PM_CASE_NUMBER, PM_PATIENT_NUMBER,
           MAX(LTRIM(RTRIM(PM_CITY)))        AS City,
           MAX(LTRIM(RTRIM(PM_STREET_NAME))) AS Street,
           MAX(LTRIM(RTRIM(PM_POST_CODE)))   AS PostCode,
           MAX(LTRIM(RTRIM(PM_PATIENT_ID)))  AS PatientId
    FROM NAMER.dbo.PATIENT_MONITORING WITH (NOLOCK)
    WHERE PM_MOVE_IN = 'X'
    GROUP BY PM_CASE_NUMBER, PM_PATIENT_NUMBER
),
Births AS (
    SELECT DISTINCT
        N'לידה' AS Kind,
        a.PM_PATIENT_NUMBER AS PatientNo,
        a.PatientId,
        a.City,
        a.Street,
        a.PostCode,
        CAST(hr.H_DOB AS DATE) AS EventDate,
        CAST(NULL AS NVARCHAR(20)) AS PregWeek
    FROM HEARING_REPORT hr WITH (NOLOCK)
    LEFT JOIN Addr a ON a.PM_CASE_NUMBER = hr.H_CASE_NUMBER_MOTHER
    WHERE hr.H_DOB >= @StartDate AND hr.H_DOB < @EndDate
),
Delivered AS (
    SELECT DISTINCT PatientNo FROM Births
),
LastVisit AS (
    SELECT
        pm.PM_PATIENT_NUMBER AS PatientNo,
        LTRIM(RTRIM(pm.PM_PATIENT_ID))   AS PatientId,
        LTRIM(RTRIM(pm.PM_CITY))         AS City,
        LTRIM(RTRIM(pm.PM_STREET_NAME))  AS Street,
        LTRIM(RTRIM(pm.PM_POST_CODE))    AS PostCode,
        CAST(pm.PM_MOVE_DATE AS DATE)    AS VisitDate,
        c.Pregnancy_Age_Calculated       AS PregWeek,
        TRY_CAST(LEFT(c.Pregnancy_Age_Calculated, CHARINDEX('+', c.Pregnancy_Age_Calculated) - 1) AS INT) AS W,
        TRY_CAST(RIGHT(c.Pregnancy_Age_Calculated, LEN(c.Pregnancy_Age_Calculated) - CHARINDEX('+', c.Pregnancy_Age_Calculated)) AS INT) AS D,
        ROW_NUMBER() OVER (PARTITION BY pm.PM_PATIENT_NUMBER ORDER BY pm.PM_MOVE_DATE DESC, pm.PM_MOVE_TIME DESC) AS rn
    FROM NAMER.dbo.PATIENT_MONITORING pm WITH (NOLOCK)
    INNER JOIN #Ch c
        ON c.CaseNumber COLLATE Hebrew_CI_AS = pm.PM_CASE_NUMBER COLLATE Hebrew_CI_AS
    WHERE pm.PM_MOVE_DATE >= @StartDate AND pm.PM_MOVE_DATE < @EndDate
      AND pm.PM_MOVE_CAT = 1 AND pm.PM_MOVE_TYPE = '01'
      AND LTRIM(RTRIM(pm.PM_MOVE_RANGE))  = N'מיון'
      AND LTRIM(RTRIM(pm.PM_MOVE_DEPART)) = N'מ-יולדות'
),
Missed AS (
    SELECT
        N'ללא לידה' AS Kind,
        v.PatientNo,
        v.PatientId,
        v.City,
        v.Street,
        v.PostCode,
        v.VisitDate AS EventDate,
        CAST(v.PregWeek AS NVARCHAR(20)) AS PregWeek
    FROM LastVisit v
    WHERE v.rn = 1 AND v.W >= @MinWeek
      AND NOT EXISTS (SELECT 1 FROM Delivered d WHERE d.PatientNo = v.PatientNo)
      AND DATEDIFF(DAY, DATEADD(DAY, ((40 - v.W) * 7) - v.D, v.VisitDate), GETDATE()) >= @GraceDays
),
AllRows AS (
    SELECT * FROM Births
    UNION ALL
    SELECT * FROM Missed
),
Filtered AS (
    SELECT *
    FROM AllRows
    WHERE (@Yishuv = N'' OR City = @Yishuv)
      AND (@Year = 0 OR YEAR(EventDate) = @Year)
      AND (@Month = 0 OR MONTH(EventDate) = @Month)
)
SELECT
    Kind       AS [סוג],
    City       AS [יישוב],
    Street     AS [רחוב],
    PostCode   AS [מיקוד],
    PatientId  AS [ת""ז],
    EventDate  AS [תאריך],
    PregWeek   AS [שבוע הריון],
    CASE WHEN Street IS NULL OR Street = N'' OR Street = City THEN 0 ELSE 1 END AS [רחוב תקין],
    COUNT(*) OVER (PARTITION BY Kind, City, Street) AS [כמות לפי רחוב וסוג],
    COUNT(*) OVER (PARTITION BY City, Street)       AS [פוטנציאל לרחוב],
    CAST(100.0 * SUM(CASE WHEN Kind = N'ללא לידה' THEN 1 ELSE 0 END)
         OVER (PARTITION BY City, Street)
         / NULLIF(COUNT(*) OVER (PARTITION BY City, Street), 0) AS DECIMAL(5,1)) AS [אחוז פספוס ברחוב]
FROM Filtered
ORDER BY City, Street, Kind;
";

    private static BirthStreetHeatRow Read(SqlDataReader reader)
    {
        return new BirthStreetHeatRow
        {
            Kind = Str(reader, "סוג"),
            City = Str(reader, "יישוב"),
            Street = Str(reader, "רחוב"),
            PostCode = Str(reader, "מיקוד"),
            PatientId = Str(reader, "ת\"ז"),
            EventDate = Str(reader, "תאריך"),
            PregnancyWeek = Str(reader, "שבוע הריון"),
            ValidStreet = Int(reader, "רחוב תקין"),
            CountByStreetKind = Int(reader, "כמות לפי רחוב וסוג"),
            StreetPotential = Int(reader, "פוטנציאל לרחוב"),
            MissPercent = Dec(reader, "אחוז פספוס ברחוב")
        };
    }

    private static string Str(SqlDataReader reader, string column)
    {
        int i = reader.GetOrdinal(column);
        if (reader.IsDBNull(i)) return "";
        object value = reader.GetValue(i);
        if (value is DateTime) return ((DateTime)value).ToString("yyyy-MM-dd");
        return Convert.ToString(value) ?? "";
    }

    private static int Int(SqlDataReader reader, string column)
    {
        int i = reader.GetOrdinal(column);
        if (reader.IsDBNull(i)) return 0;
        return Convert.ToInt32(reader.GetValue(i));
    }

    private static decimal Dec(SqlDataReader reader, string column)
    {
        int i = reader.GetOrdinal(column);
        if (reader.IsDBNull(i)) return 0m;
        return Convert.ToDecimal(reader.GetValue(i));
    }
}
