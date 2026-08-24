# Backend prompt: `GetAdmissionsByDirection` (מדד 1.5)

מקורות: **`PATIENT_MONITORING`** (קבלה ראשונה, `PM_MOVE_CAT=1`, `PM_MOVE_TYPE=01`) · **`MedicalRecords`** למממן · **`TRY_CONVERT(BIGINT)`** מנטרל `00` מוביל.

---

## 1. DTO + Service method

```csharp
public class RehabilitationAdmissionsByDirection
{
    public DateTime Date { get; set; }
    public string FunderName { get; set; }
    public string Direction { get; set; }
    public int AdmissionsCount { get; set; }
    public int Unit { get; set; }
    public string DepartmentName { get; set; }
}

public List<RehabilitationAdmissionsByDirection> GetAdmissionsByDirection(
    DateTime fromDate,
    DateTime toDate)
{
    var result = new List<RehabilitationAdmissionsByDirection>();

    using (SqlConnection connection = new SqlConnection(connetionString))
    {
        string query = @"
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

;WITH Admissions AS
(
    SELECT
        CAST(pm.PM_MOVE_DATE AS date) AS AdmissionDate,
        LTRIM(RTRIM(pm.PM_CASE_NUMBER)) AS CaseNumber,
        LTRIM(RTRIM(pm.PM_MOVE_DEPART)) AS DepartmentCode,
        LTRIM(RTRIM(pm.PM_MOVE_RANGE)) AS Source,

        ROW_NUMBER() OVER
        (
            PARTITION BY
                LTRIM(RTRIM(pm.PM_CASE_NUMBER))
            ORDER BY
                pm.PM_MOVE_DATE,
                pm.PM_MOVE_TIME
        ) AS rn

    FROM dbo.PATIENT_MONITORING pm WITH (NOLOCK)

    WHERE pm.PM_MOVE_DATE >= @FromDate
      AND pm.PM_MOVE_DATE < DATEADD(DAY, 1, @ToDate)

      -- רק מחלקות השיקום
      AND LTRIM(RTRIM(pm.PM_MOVE_DEPART)) IN
      (
          N'רשיקום-י',
          N'רשיקום-כ',
          N'רגרי-ש'
      )

      -- קבלה חדשה
      AND LTRIM(RTRIM(pm.PM_MOVE_CAT)) = '1'
      AND LTRIM(RTRIM(pm.PM_MOVE_TYPE)) = '01'
),

FirstAdmissions AS
(
    SELECT
        AdmissionDate,
        CaseNumber,
        DepartmentCode,
        Source
    FROM Admissions
    WHERE rn = 1
)

SELECT
    a.AdmissionDate,

    CASE a.DepartmentCode
        WHEN N'רשיקום-י' THEN 49
        WHEN N'רגרי-ש' THEN 85
        WHEN N'רשיקום-כ' THEN 150685851
    END AS Unit,

    CASE a.DepartmentCode
        WHEN N'רשיקום-י'
            THEN N'מחלקת שיקום ילדים'

        WHEN N'רגרי-ש'
            THEN N'המחלקה לגריאטריה שיקומית'

        WHEN N'רשיקום-כ'
            THEN N'מחלקת שיקום כללי'
    END AS DepartmentName,

    CASE
        WHEN payer.Pay_Institute IN (10, 11, 12, 13)
            THEN N'קופת חולים'

        WHEN payer.Pay_Institute = 98
            THEN N'צה״ל + משרד הביטחון'

        WHEN payer.Pay_Institute = 99
            THEN N'פרטי'

        ELSE N'אחר'
    END AS FunderName,

    CASE
        WHEN LTRIM(RTRIM(a.Source)) = N'אישפוז'
            THEN N'פנים'

        ELSE N'חוץ'
    END AS Direction,

    COUNT(*) AS AdmissionsCount

FROM FirstAdmissions a

OUTER APPLY
(
    SELECT TOP 1
        mr.Pay_Institute
    FROM [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] mr WITH (NOLOCK)

    WHERE mr.Hospital = 34

      -- מנטרל את ה-00 המובילים
      AND TRY_CONVERT(BIGINT, mr.Admission_No)
          =
          TRY_CONVERT(BIGINT, a.CaseNumber)

    ORDER BY
        mr.Record_Date DESC
) payer

GROUP BY
    a.AdmissionDate,
    a.DepartmentCode,
    a.Source,
    payer.Pay_Institute

ORDER BY
    a.AdmissionDate,
    Unit;
";

        using (SqlCommand command = new SqlCommand(query, connection))
        {
            command.CommandTimeout = 120;

            command.Parameters.Add(
                "@FromDate",
                SqlDbType.DateTime
            ).Value = fromDate.Date;

            command.Parameters.Add(
                "@ToDate",
                SqlDbType.DateTime
            ).Value = toDate.Date;

            connection.Open();

            using (SqlDataReader reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    var item = new RehabilitationAdmissionsByDirection();

                    item.Date = Convert.ToDateTime(
                        reader["AdmissionDate"]
                    );

                    item.Unit = Convert.ToInt32(
                        reader["Unit"]
                    );

                    item.DepartmentName =
                        reader["DepartmentName"] == DBNull.Value
                            ? ""
                            : reader["DepartmentName"].ToString();

                    item.FunderName =
                        reader["FunderName"] == DBNull.Value
                            ? "אחר"
                            : reader["FunderName"].ToString();

                    item.Direction =
                        reader["Direction"] == DBNull.Value
                            ? "חוץ"
                            : reader["Direction"].ToString();

                    item.AdmissionsCount =
                        Convert.ToInt32(reader["AdmissionsCount"]);

                    result.Add(item);
                }
            }
        }
    }

    return result;
}
```

---

## 2. `WebService.cs`

```csharp
[WebMethod]
[OperationContract]
public List<RehabilitationAdmissionsByDirection>
    GetRehabilitationAdmissionsByDirection(
        DateTime FromDate,
        DateTime ToDate)
{
    return _RehabilitationOccupancyService
        .GetAdmissionsByDirection(FromDate, ToDate);
}
```

---

## 3. סיווג `Pay_Institute` → `FunderName`

| Pay_Institute | FunderName |
|---------------|------------|
| 10, 11, 12, 13 | קופת חולים |
| 98 | צה״ל + משרד הביטחון |
| 99 | פרטי |
| NULL / אחר | אחר |

---

## 4. בדיקת API — 11/08/2026

```http
POST http://localhost:64964/WebService.asmx/GetRehabilitationAdmissionsByDirection
Content-Type: application/json
Accept: application/json
```

```json
{
    "FromDate": "2026-08-11",
    "ToDate": "2026-08-11"
}
```

צפוי לפחות:

```json
{
  "d": [
    {
      "Date": "/Date(...)/",
      "FunderName": "קופת חולים",
      "Direction": "פנים",
      "AdmissionsCount": 1,
      "Unit": 49,
      "DepartmentName": "מחלקת שיקום ילדים"
    },
    {
      "Date": "/Date(...)/",
      "FunderName": "קופת חולים",
      "Direction": "פנים",
      "AdmissionsCount": 1,
      "Unit": 150685851,
      "DepartmentName": "מחלקת שיקום כללי"
    }
  ]
}
```

(`Pay_Institute` 10 ו-13 → **קופת חולים**)

---

## 5. צרכן (Angular)

הפרונט כבר קורא ל-`GetRehabilitationAdmissionsByDirection` בבלוק **1.5** — מקבל כל `FunderName`/`Direction` דינמית.
