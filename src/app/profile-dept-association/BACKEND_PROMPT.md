# Backend — 4 WebMethods (no business logic)

Same `WebService.asmx` base as `environment.url`. POST + JSON body `{}`. Return a JSON **array**. Use your usual `.d` wrapper if that is how other methods work.

---

### 1. `GetEpDepartnentDescriptions`

```sql
SELECT DISTINCT
    DepartnentCode,
    DepartnentDescripton
FROM [NAMER].[dbo].[EP_Departnents] WITH (NOLOCK)
WHERE DepartnentDescripton IS NOT NULL
ORDER BY DepartnentDescripton;
```

**Response:** `[{ "DepartnentCode": "...", "DepartnentDescripton": "..." }, ...]`

---

### 2. `GetChameleonSystemUnitNames`

```sql
SELECT DISTINCT
    Name,
    Unit AS DepartmentCode
FROM [SRV-cp-db-3].[Chameleon].[dbo].[SystemUnits]
WHERE Is_Not_Active IS NULL
  AND Name IS NOT NULL
  AND Unit IS NOT NULL
ORDER BY Name;
```

**Response:** `[{ "Name": "...", "DepartmentCode": "..." }, ...]`

---

### 3. `GetOnlineProfileFunctionDescriptions`

```sql
SELECT DISTINCT FunctionDescription
FROM OnlineProfileToCham;
```

**Response:** `[{ "FunctionDescription": "..." }, ...]`

---

### 4. `GetChameleonProfileNames`

```sql
SELECT Profile_Name
FROM [SRV-cp-db-3].[Chameleon].[dbo].[V_ProfilesPermissions];
```

(Add `DISTINCT` if needed.)

**Response:** `[{ "Profile_Name": "..." }, ...]`

---

### 5. `SaveOnlineDeptToChamMappings`

Receives one online department + selected Chameleon mappings and writes to `OnlineDeptToCham` without duplicates.

**Request body:**

```json
{
  "_department": {
    "DepartnentCode": "10010",
    "DepartnentDescripton": "פנימית"
  },
  "_mappings": [
    { "ChameleonDepartment": "מחלקה פנימית", "DepartmentCode": "U123" },
    { "ChameleonDepartment": "מחלקה פנימית א", "DepartmentCode": "U124" }
  ],
  "_updatedBy": ""
}
```

**Duplicate-safe rule per mapping item:**

1. If exact mapping already exists (`DepartnentCode + DepartnentDescripton + ChameleonDepartment + DepartmentCode`) -> skip.
2. Else if same department row exists with null mapping (`ChameleonDepartment IS NULL AND DepartmentCode IS NULL`) -> update that row.
3. Else -> insert a new row.

**Response:** any success object/string used by your existing WebService pattern.
