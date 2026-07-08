# Backend fix: `getNappProceduresListByRequestID`

Replace your current implementation with the version below.

## Problems in the original

| Issue | Fix |
|-------|-----|
| No `Canceled` filter | Exclude `Canceled = 'X'` |
| `DBNull.ToString()` | Safe `ReadString` helper |
| `RequestID` padding mismatch | `LTRIM(RTRIM(...))` on both sides |
| `S_ID` join mismatch | Trim both `NPCPCode` and `S_ID` |
| Empty `_RequestID` | Return `[]` early |
| Duplicate rows | `DISTINCT` on procedure code |

---

## DTO (unchanged — already correct)

```csharp
public class NappProcedureDto
{
    public string SurgeryCode { get; set; }
    public string SurgeryName { get; set; }
    public string Catalog { get; set; }
    public string Side { get; set; }
    public string Priority { get; set; }
    public string Depart { get; set; }
    public string SeodeDepart { get; set; }
    public string BloodUnit { get; set; }
    public string Surgery_Code { get; set; }
    public string Surgery_Name { get; set; }
}
```

Angular reads **both** `SurgeryCode`/`SurgeryName` and `Surgery_Code`/`Surgery_Name`.

---

## WebService

```csharp
[WebGet]
[WebMethod]
[OperationContract]
public List<SurgeriesCalendar.NappProcedureDto> getNappProceduresListByRequestID(string _RequestID)
{
    return _SurgeriesCalendar.getNappProceduresListByRequestID(_RequestID);
}
```

---

## Repository — fixed implementation

```csharp
private static string ReadString(SqlDataReader reader, string column)
{
    int ordinal = reader.GetOrdinal(column);
    if (reader.IsDBNull(ordinal))
        return "";

    return reader.GetValue(ordinal).ToString().Trim();
}

public List<NappProcedureDto> getNappProceduresListByRequestID(string _RequestID)
{
    List<NappProcedureDto> proceduresList = new List<NappProcedureDto>();

    string requestId = (_RequestID ?? "").Trim();
    if (string.IsNullOrEmpty(requestId))
        return proceduresList;

    using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
    {
        string oString = @"
SELECT DISTINCT
    npc.NPCPCode,
    sn.S_SERVICE_VAL,
    sn.S_CATALOG,
    npc.Side,
    npc.Priority,
    npc.Depart,
    npc.SeodeDepart,
    npc.BloodUnit
FROM [NAMER].[dbo].[NAPP] n WITH (NOLOCK)
INNER JOIN [NAMER].[dbo].[NAPP_NPCPCode] npc WITH (NOLOCK)
    ON n.VKGID = npc.VKGID
LEFT JOIN [NAMER].[dbo].[SERVICES_NAME] sn WITH (NOLOCK)
    ON LTRIM(RTRIM(npc.NPCPCode)) = LTRIM(RTRIM(sn.S_ID))
WHERE LTRIM(RTRIM(n.RequestID)) = LTRIM(RTRIM(@RequestID))
  AND (n.Canceled IS NULL OR n.Canceled <> 'X')
  AND n.VKGID IS NOT NULL
ORDER BY npc.NPCPCode";

        SqlCommand oCmd = new SqlCommand(oString, myConnection);
        oCmd.Parameters.AddWithValue("@RequestID", requestId);

        myConnection.Open();

        using (SqlDataReader oReader = oCmd.ExecuteReader())
        {
            while (oReader.Read())
            {
                string surgeryCode = ReadString(oReader, "NPCPCode");
                if (string.IsNullOrEmpty(surgeryCode))
                    continue;

                string surgeryName = ReadString(oReader, "S_SERVICE_VAL");

                NappProcedureDto procedure = new NappProcedureDto
                {
                    SurgeryCode = surgeryCode,
                    Surgery_Code = surgeryCode,
                    SurgeryName = surgeryName,
                    Surgery_Name = surgeryName,
                    Catalog = ReadString(oReader, "S_CATALOG"),
                    Side = ReadString(oReader, "Side"),
                    Priority = ReadString(oReader, "Priority"),
                    Depart = ReadString(oReader, "Depart"),
                    SeodeDepart = ReadString(oReader, "SeodeDepart"),
                    BloodUnit = ReadString(oReader, "BloodUnit")
                };

                proceduresList.Add(procedure);
            }
        }
    }

    return proceduresList;
}
```

---

## Notes

- **`VKGID IS NULL`:** returns empty list (no row in `NAPP_NPCPCode`). Expected.
- **`S_SERVICE_VAL` empty:** procedure still returned with code only; Angular shows code in summary.
- **Used by:** `GetNappWaitingForVirtualRoomScheduling` → `Procedures` per waiting row.

---

## Quick test

```sql
SELECT n.RequestID, n.VKGID, n.Canceled, npc.NPCPCode, sn.S_SERVICE_VAL
FROM [NAMER].[dbo].[NAPP] n
LEFT JOIN [NAMER].[dbo].[NAPP_NPCPCode] npc ON n.VKGID = npc.VKGID
LEFT JOIN [NAMER].[dbo].[SERVICES_NAME] sn ON LTRIM(RTRIM(npc.NPCPCode)) = LTRIM(RTRIM(sn.S_ID))
WHERE LTRIM(RTRIM(n.RequestID)) = LTRIM(RTRIM('YOUR_REQUEST_ID'))
  AND (n.Canceled IS NULL OR n.Canceled <> 'X');
```

If `VKGID` is NULL → fix in SAP, not in SQL.
