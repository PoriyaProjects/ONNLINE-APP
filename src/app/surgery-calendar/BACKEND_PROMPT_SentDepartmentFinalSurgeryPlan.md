# Backend: SentDepartmentFinalSurgeryPlan — debug `return false`

## Symptom
Frontend POST returns `{"d":false}` with HTTP 200. Payload reaches the server correctly.

## Root cause
The method catches **all** exceptions and returns `false` without logging:

```csharp
catch (Exception ex)
{
    return false;
}
```

## Likely failure points on localhost/dev

1. **`rfc.CreatePlannedFinalSurgeries(fileString, department)`** — PDF path/permissions/HTML-to-PDF tooling
2. **`SmtpServer.Send(mail)`** — `SmtpClient("172.19.19.10")` is an internal hospital relay; **localhost usually cannot reach it**

## Recommended server fix

```csharp
catch (Exception ex)
{
    System.Diagnostics.Trace.WriteLine("SentDepartmentFinalSurgeryPlan: " + ex);
    throw; // or return error message to client for debugging
}
```

Or return structured result: `{ success: false, error: ex.Message }`

## Expected request (unchanged from original frontend)

| Field | Example |
|-------|---------|
| department | `'יחידת עיניים'` (SQL-quoted string from calendar) |
| fileString | HTML report body |
| arrivalDate | `yyyy-MM-dd` |
| calendarRoomsArea | `חדר ניתוח כללי` |
| users | `[{ FirstName, LastName, id, Email }]` |

## Frontend
No change needed to payload shape — issue is server-side exception handling / SMTP/PDF environment.
