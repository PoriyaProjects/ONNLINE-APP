# Backend prompt: Add UpdateMriPattern endpoint

Send the following to your backend agent to implement the MRI pattern update.

---

## Request

Add a new endpoint that the Angular MRI Schedule frontend will call to update the **Num** (capacity) value for a specific pattern and day.

### Endpoint

- **Method:** POST  
- **Name/URL:** `UpdateMriPattern` (same base URL as existing WebService.asmx, e.g. `WebService.asmx/UpdateMriPattern`).

### Request body (JSON)

The frontend sends a JSON body with three fields:

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `Pattern` | string | Template/pattern name (e.g. "ביטנים", "נוירו עם ח.נ") |
| `Dayy`    | string | **Weekday name** (one of: "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"). Capacity is per weekday, not per calendar date. |
| `Num`     | string | New value to set for capacity (Num column) |

Example:

```json
{
  "Pattern": "ביטנים",
  "Dayy": "Sunday",
  "Num": "5"
}
```

### Backend behavior

Execute the following SQL update (adjust server/database/schema names if your environment differs):

```sql
UPDATE [SRV-AUTOAP].[AutomationProcesses].[dbo].[Patterns]
SET Num = @Num
WHERE Pattern = @Pattern AND Dayy = @Dayy
```

- Use parameterized queries (e.g. `@Pattern`, `@Dayy`, `@Num`) to avoid SQL injection.
- Return a success response (e.g. HTTP 200 and a simple success payload or empty body) when the update runs.
- If no row matches (Pattern + Dayy), you may either return 404 or still return 200 and 0 rows updated, depending on your API convention.

### Response

- **Success:** HTTP 200. Body can be empty or e.g. `{ "success": true }`.
- **Error:** HTTP 4xx/5xx with an optional message the frontend can show (e.g. `{ "message": "Invalid parameters" }`).

---

## Summary for backend

1. Add **POST** endpoint: **UpdateMriPattern**.
2. Accept JSON body: **Pattern** (string), **Dayy** (string, weekday name: "Sunday", "Monday", … "Saturday"), **Num** (string).
3. Run: `UPDATE [SRV-AUTOAP].[AutomationProcesses].[dbo].[Patterns] SET Num = @Num WHERE Pattern = @Pattern AND Dayy = @Dayy`. (Dayy in DB is the weekday, not a date.)
4. Return 200 on success; 4xx/5xx on failure with optional message.

Once this endpoint exists, the MRI Schedule “Edit” dialog will call it and refresh the schedule table after a successful update.
