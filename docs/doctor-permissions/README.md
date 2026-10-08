# Doctors Permissions / מערכת הרשאות רופאים

Development phases 1–20 are complete. This file is the handover. The Hebrew notes below it are the operational record written during development. Table and API detail is in [database.md](database.md) and [architecture.md](architecture.md).

## Contents

- [Overview](#overview)
- [Roles and scope](#roles-and-scope)
- [Routes](#routes)
- [Critical business rules](#critical-business-rules)
- [Workflows](#workflows)
- [Scheduled processing](#scheduled-processing)
- [Troubleshooting](#troubleshooting)
- [Validation and limitations](#validation-and-limitations)
- [Final handover](#final-handover)
- Hebrew operational notes follow the handover

## Overview

Doctors Permissions records which clinical permissions an employee holds, who approved them, when they expire, and how they are renewed. It does not replace the employee master file.

NAMER `EP_Employees` and `EP_Departnents` are read-only sources. The column spelling `Departnent` is the real schema name. `EmployeeID` is the employee key. `ManagerID1` and `ManagerID2` point at another employee's `EmployeeID`. Active employees are those with `EndWorkDate` empty. This module stores profiles, assignments, approvals, notes, history, notifications, and one business setting. It does not copy the employee master list.

Users are employees reviewing their own permissions, managers approving requests in their scope, and admins maintaining the catalog, templates, notifications, and settings.

## Roles and scope

The signed-in person is the Windows identity, matched to one active `EP_Employees.ADUserName`. The browser does not send a user id.

| Who | What they see |
|---|---|
| Any resolved employee | Dashboard, employee search, own My Permissions |
| Direct manager | People whose `ManagerID1` is the caller, plus the approval queue |
| Indirect manager | People whose `ManagerID2` is the caller, plus the approval queue |
| Department manager | `DEPARTMENT_MANAGER` on one `DepartnentCode`, templates, and the queue for that department |
| Admin | `ADMIN`. Catalog, HR board, organizational changes, notifications, settings, and every employee |

An approver cannot approve, reject, or resubmit their own assignment. Search and dashboard counts stay inside the caller's scope. The pending and delayed dashboard figures omit the caller, matching the queue.

## Routes

Hash routes under `#/doctors-permissions`. There is no `employees`, `permissions`, or `my-permissions` path.

| Route | Screen | Who |
|---|---|---|
| `dashboard` | לוח בקרה | Everyone in scope |
| `search` | חיפוש עובדים | Everyone in scope |
| `employee/:employeeId` | Employee card | Everyone in scope |
| `approvals` | ממתינים לאישור | Approvers |
| `my` | ההרשאות שלי | The signed-in employee |
| `templates` | תבניות | Department manager, admin |
| `catalog` | קטלוג הרשאות | Admin |
| `hr` | לוח HR | Admin. Same dashboard with the HR flag |
| `organizational-changes` | שינויים ארגוניים | Admin |
| `notifications` | התראות והודעות | Admin |
| `settings` | הגדרות | Admin |
| `` | Redirects to `dashboard` | |

## Critical business rules

- An employee may have several profiles. The same catalog permission may exist on two profiles. `UX_DpEmpPerm_OpenSame` blocks a second open row (`DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `SUSPENDED`) for the same permission on one profile.
- Stored statuses are `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `EXPIRED`, `SUSPENDED`, `CANCELLED`. Hebrew labels live in `dp-status.ts`.
- Current means `APPROVED`, not past `ExpirationDate`, and not superseded. Expired means stored `EXPIRED`, or `APPROVED` with `ExpirationDate` already past. Expiring is a current row whose expiration falls inside the catalog lead. A negative lead counts as 3 months on screen and 0 months in the job.
- A pending or rejected renewal child does not supersede the parent. An approved or expired child does. `UX_DpEmpPerm_OpenRenewal` allows one open child (`DRAFT` or `PENDING_APPROVAL`) per parent.
- Approval sets `ExpirationDate` from the catalog `DefaultValidityMonths` at that moment, or 36 months when the catalog value is under 1. Later catalog or settings edits do not rewrite `ApprovalDate` or `ExpirationDate`.
- Reject requires a reason. The row stays `REJECTED` until `DpResubmitPermission` sets the same row back to `PENDING_APPROVAL`. The earlier rejection action remains. My Permissions does not offer resubmit.
- Waiting time is the latest `RESUBMIT` time, otherwise `CreatedAt`. Delayed is pending longer than `ApprovalDelayWarningDays` (default 14, range 0–365). It is not a stored status.
- Applying a new template adds missing permissions. It does not delete permissions the old template no longer lists, and editing a template does not rewrite profiles already created from it.
- Deactivating a catalog permission blocks new assignment. Existing rows stay.
- Notes are on `EmployeeId` only. Blank text is rejected. Removing a note sets `IsActive = 0`.
- History is the audit log, newest first. It drops the employee pointer row when the same action is already on the permission, profile, or note, and it drops the parent `RENEWAL_STARTED` row that only points at the child. My Permissions asks for the employee-facing slice.
- A notification failure does not change the permission. Statuses are `QUEUED`, `SENT`, `FAILED`, `SKIPPED`. Retry sets the same `FAILED` row to `QUEUED` before send, up to 3 attempts, and refuses a row that is already queued or sent.
- The only stored business setting is `ApprovalDelayWarningDays`. Validity and renewal lead stay on each catalog row.

## Workflows

Create a profile: search, open the employee, יצירת פרופיל חדש, choose department and template, review the permissions, שמירה. The new rows start as `PENDING_APPROVAL`.

Approve or reject: ממתינים לאישור, then אישור or דחייה. Rejection shows the employee, profile, and permission and requires a reason. The row leaves the queue.

Resubmit: on the employee card, הגשה מחדש on a rejected row. It returns to the queue. Waiting time starts at the resubmit.

Renewal: the job opens one `PENDING_APPROVAL` child with `RenewalSourceId` while the parent is still `APPROVED` and inside the lead window. Approving the child makes it the new current row. Rejecting it leaves the parent current until the parent date passes.

Organizational change: the first snapshot is a baseline and not an event. A later change of `DepartnentCode`, `FunctionID`, or `JobTitleID` writes one event per field. One matching template may add a profile or missing required permissions. No template, or two equal matches, stays for manual review. A second profile that does not match the new department, function, and job is left alone.

## Scheduled processing

`DpProcessScheduledJobs` runs, in order, expiry (up to 500), renewal creation (up to 500), baseline snapshots, organizational detection (up to 500), then due notifications (up to 200). A repeat with no new NAMER change and no new renewal window does not insert another org event or another renewal child. The job key is configured outside this module and is not written here. Email and SMS use the existing portal providers.

## Troubleshooting

Queue empty: the row must be `PENDING_APPROVAL` on an active profile, for an active employee, inside the caller's scope, and not the caller's own row. Check the wait and new/renewal filters.

Renewal missing: parent must be `APPROVED`, dated, still unexpired, inside the lead, on an active profile, with no non-cancelled child.

Notification failed: filter נכשלו, open the row, read `FailureReason`. שליחה מחדש only while status is `FAILED` and `RetryCount` is under 3. The permission status is unchanged.

Organizational review: filter דורש טיפול. `NO_TEMPLATE`, `NO_MATCHING_PROFILE`, and `AMBIGUOUS` are the manual cases.

## Validation and limitations

Non-production `npx ng build --source-map=false --optimization=false --progress=false` passed through Phase 19. Last hash `c7ef659e9791e6ae1d59`, 2026-10-08. No C# compile was run. The SQL scripts were not executed in that work. The screens were not opened. NAMER was not available in that session, so approve, reject, renewal, and organizational runs were not executed against data.

Do not deduplicate permissions across profiles. Do not delete rejection history on resubmit. Do not insert a second open renewal child. Do not rewrite profiles after a template edit. Do not write Doctors Permissions rows into `EP_Employees`. Do not update historical expiration dates when the delay setting changes.

# הרשאות רופאים

מודול Angular 9 + מתודות `Dp*` על `WebService.asmx`. לא משדרג את Angular ולא את ה-backend.

מזהה העובד במסד הוא `EP_Employees.EmployeeID`. `localStorage.ID` הוא תצוגה בצד הלקוח בלבד. `ManagerID1` ו-`ManagerID2` מצביעים ל-`EmployeeID` של מנהל. `RowID` לא בשימוש במודול.

הפורטל ב-`environment.prod.ts` קורא ל-`http://srv-apps-prod/RCF_WS/WebService.asmx/`. תמונות הפורטל גם הן על `http://srv-apps-prod`. זה אותו מקור (סכמה, מארח ופורט). יש לפתוח את האפליקציה מ-`http://srv-apps-prod`. קריאה ממקור אחר לא נתמכת: כותרת `Access-Control-Allow-Origin: *` נשארת כי שאר המודולים משתמשים בה, ובקשת credentials ממקור אחר נדחית בדפדפן. לא משנים את הכותרת הזו.

## IIS / Windows Authentication Prerequisites

ב-`Web.config` יש `<authentication mode="Windows" />`. אין impersonation ואין `<deny users="?"/>`. חיבור SQL נשאר `NAMER_DB` עם משתמש SQL, לא חשבון Windows של הרופא.

על אפליקציית IIS `RCF_WS`:

- Windows Authentication: Enabled
- Anonymous Authentication: נשאר Enabled לשאר מתודות `WebService.asmx`. לא לכבות Anonymous לכל האתר
- בקשת `Dp*` חייבת להגיע ל-ASP.NET עם `IsAuthenticated` ו-`Name` כגון `PORIA\user`, `user@domain` או `user`. אם Anonymous מנצח, כל קריאת `Dp*` נדחית
- השם מנורמל לחשבון (אחרי `\`, לפני `@`). חשבון שמסתיים ב-`$` נדחה. שאר החשבונות לא מסווגים
- ההתאמה היא ל-`EP_Employees.ADUserName` של עובד פעיל אחד (`EndWorkDate` ריק)
- Angular שולח את קריאות המודול עם `withCredentials`. באותו מקור זה לא דורש CORS

### כל קריאת Dp נדחית

1. Windows Authentication דלוק על `RCF_WS`
2. Anonymous לא בלע את הבקשה לפני שהמשתמש זוהה
3. `HttpContext.Current.User.Identity` מאומת והשם הוא חשבון אדם
4. `EP_Employees.ADUserName` תואם אחרי נירמול
5. לעובד אין `EndWorkDate`
6. אין שני עובדים פעילים עם אותו `ADUserName`

הלקוח רואה: לא ניתן לזהות את המשתמש המחובר. יש להתחבר למערכת באמצעות חשבון הארגון.

הלוג `Logs/DoctorPermissions_yyyyMMdd.txt` רושם `IsAuthenticated`, את החשבון המנורמל, ו-`resolved` / `unauthenticated` / `machine` / `none` / `duplicate`. אין מתודת אבחון ציבורית. המפתח לא נכתב ללוג.

### הדפדפן מדווח על CORS

1. האפליקציה צריכה להיפתח מ-`http://srv-apps-prod`, אותו מקור כמו `WebService.asmx`
2. אין מקור מותר נפרד. `*` לא משמש את המודול
3. credentials דלוקים רק בקריאות המודול
4. `*` יחד עם credentials לא תקף בין אתרים, וזה מכוון
5. באותו מקור אין preflight. בין אתרים הבקשה נחסמת

## אבחון ADUserName

לא משנים את `EP_Employees`. לא מוסיפים UNIQUE.

```sql
SELECT ADUserName, COUNT(*) AS Cnt
FROM NAMER.dbo.EP_Employees
WHERE EndWorkDate IS NULL
  AND ADUserName IS NOT NULL
  AND LTRIM(RTRIM(ADUserName)) <> N''
GROUP BY ADUserName
HAVING COUNT(*) > 1;

SELECT EmployeeID, ADUserName
FROM NAMER.dbo.EP_Employees
WHERE EndWorkDate IS NULL
  AND (ADUserName IS NULL OR LTRIM(RTRIM(ADUserName)) = N'');

SELECT EmployeeID, ADUserName
FROM NAMER.dbo.EP_Employees
WHERE EndWorkDate IS NULL
  AND (
      ADUserName LIKE N'%\%'
      OR ADUserName LIKE N'%@%'
      OR ADUserName LIKE N'%$'
  );
```

השאילתה השלישית מסמנת ערכים שנראים כמו `DOMAIN\user`, דוא"ל, או חשבון מכונה. ההתאמה בשרת מצפה לשם החשבון בלבד.

## מסכים

נתיב: `#/doctors-permissions`

| מסך | נתיב | מי רואה |
|---|---|---|
| לוח בקרה | `dashboard` | כל מי שנכנס למודול, לפי היקף |
| חיפוש עובדים | `search` | אותו היקף |
| כרטיס עובד | `employee/:employeeId` | אותו היקף |
| ממתינים לאישור | `approvals` | מנהל ישיר, עקיף, מנהל מחלקה, מנהל מערכת |
| ההרשאות שלי | `my` | העובד המחובר |
| תבניות | `templates` | מנהל מחלקה או מנהל מערכת |
| קטלוג הרשאות | `catalog` | מנהל מערכת |
| לוח HR | `hr` | מנהל מערכת |
| שינויים ארגוניים | `organizational-changes` | מנהל מערכת |
| התראות והודעות | `notifications` | מנהל מערכת |
| הגדרות | `settings` | מנהל מערכת |

## שימוש

חיפוש עובדים רץ בשרת, 50 שורות בעמוד, וממוין לפי שם משפחה ושם פרטי. הסינון הוא שם או מספר עובד, מחלקה, תפקיד, משרה, התמחות, פרופיל הרשאות וסטטוס (פעיל, ממתין, נדחה, עומד לפוג, פג תוקף, אישור בעיכוב מעל `ApprovalDelayWarningDays`, ברירת מחדל 14). כל שורה היא עובד אחד עם מספר פרופילים ומונים של הרשאות פעילות, ממתינות, נדחות, לקראת פקיעה ופגות. עובד בלי פרופיל מופיע עם אפס. חידוש ממתין נספר כממתין ולא כהרשאה פעילה נוספת. התוצאות נשארות בתוך היקף הקורא. כרטיסי הלוח וספירות המחלקה נפתחים באותו מסך עם `departnentCode` ו-`status` בכתובת. סינון לפי הרשאה בודדת מהקטלוג אינו חלק מהחיפוש.

כרטיס העובד נפתח ב-`#/doctors-permissions/employee/:employeeId`, גם מקישור ישיר. חזרה לחיפוש משחזרת את כתובת החיפוש כשהגלישה הגיעה משם. הסקירה מציגה פרופילים, הרשאות פעילות, ממתינות, נדחות, עומדות לפוג ופגות, ומצב `תקין` או `נדרש טיפול`. כל פרופיל נשאר נפרד, עם תבנית, תאריך יצירה ומונים משלו. אותה הרשאה בשני פרופילים מוצגת בשניהם. הרשאה מאושרת עם חידוש פתוח נשארת בתוקף ומוצגת עם `תהליך חידוש`. דחייה מציגה סיבה ושם הדוחה. היסטוריה נטענת בלשונית ונשמרת בנפרד מהסטטוס הנוכחי. הערות ניתנות להוספה ולעריכה על ידי הכותב או מנהל מערכת; הטקסט הקודם נשמר ביומן. בלי פרופיל מוצג "לעובד עדיין לא הוגדר פרופיל הרשאות." במובייל טבלת ההרשאות מוסתרת והכרטיסים נשארים.

לעובד יכולים להיות כמה פרופילים. תבנית בזמן יצירה או החלפה היא אופציונלית. הרשאות שנוצרות מהתבנית נשמרות כ-`PENDING_APPROVAL` באותה טרנזקציה. הרשאה שכבר קיימת באותו פרופיל במצב טיוטה, ממתינה, מאושרת, מושעית או נדחית לא משוכפלת. אותה הרשאה בפרופיל אחר מותרת. החלפת תבנית מוסיפה רק הרשאות חסרות ולא מוחקת הרשאות שנשארו. סגירה מסמנת את הפרופיל כלא פעיל ושומרת את ההיסטוריה; אפשר להפעיל אותו מחדש. הוספה ידנית נעשית מחיפוש בקטלוג שכבר נטען.

ניהול תבניות הפרופיל נמצא ב-`#/doctors-permissions/templates`. הרשימה מסוננת לפי שם, מחלקה, תיאור וסטטוס, ומציגה מספר הרשאות ומספר פרופילים פעילים וכולל. יצירה ועריכה נשמרות בטרנזקציה אחת: פרטי התבנית, והרשאות שנשארו, נוספו או הוסרו. מחלקה נדרשת. תפקיד ומשרה אופציונליים. כל הרשאה בתבנית מסומנת כחובה או אופציונלית. אותה הרשאה לא נשמרת פעמיים באותה תבנית. השבתה מסתירה את התבנית מפרופילים חדשים ואינה סוגרת פרופילים קיימים; אפשר להפעיל אותה מחדש. עריכת תבנית אחרי שנוצרו ממנה פרופילים משפיעה רק על יצירה עתידית. פרופיל עובד קיים לא מתעדכן אוטומטית.

ניהול הרשאות נמצא ב-`#/doctors-permissions/catalog`. הרשימה מסוננת לפי שם, קוד, תיאור, קטגוריה, סטטוס ושימוש. לכל הרשאה יש קוד יציב, שם, קטגוריה חופשית, תוקף ברירת מחדל בחודשים וחלון חידוש קצר מהתוקף. הקוד ייחודי. קוד של הרשאה שכבר בתבנית או בהקצאה לא משתנה. השבתה מסתירה את ההרשאה מבחירה חדשה בתבנית ובפרופיל, ואינה מוחקת תבניות או הקצאות קיימות. תבנית שמכילה הרשאה שהושבתה ממשיכה להציג אותה כלא פעילה. שינוי תוקף או חלון חידוש חל על אישורים וחידושים חדשים בלבד ואינו משכתב תאריך פקיעה שכבר נשמר. המונים הם מספר תבניות, מספר הקצאות שאינן מבוטלות, ומספר הקצאות מאושרות.

סטטוס שמור נשאר `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `EXPIRED`, `SUSPENDED` או `CANCELLED`. הרשאה נוכחית היא `APPROVED` שתאריך הפקיעה שלה ריק או לא עבר את `GETDATE()`. הרשאה פגה כשהסטטוס `EXPIRED`, או שהיא `APPROVED` ותאריך הפקיעה מוקדם מ-`GETDATE()`. עומדת לפוג היא תת-קבוצה של הנוכחיות: תאריך הפקיעה בתוך `RenewalLeadMonths`, ואם הערך שלילי נספרים שלושה חודשים. ילד חידוש ממתין אינו נוכחי. הורה מאושר שעדיין בתוקף נשאר נוכחי. ילד שאושר והורה שעדיין בתוקף נספרים שניהם. לוח הבקרה, החיפוש ומסך העובד משתמשים באותם תנאים. סיכום העובד סופר פרופילים פעילים בלבד. ממתינות הן `PENDING_APPROVAL` בלבד. תור האישורים נשאר `PENDING_APPROVAL` בלבד.

הערות העובד נשמרות על `EmployeeId` ונפתחות בלשונית הערות בכרטיס העובד, רק כשפותחים אותה. הוספה ועריכה דורשות טקסט אחרי חיתוך קצוות, עד 4000 תווים, בלי קיצור שקט. שורות וטקסט בעברית ובערבית נשמרים. הכותב והתאריכים נקבעים בשרת. עריכה שומרת את היוצר ואת זמן היצירה ורושמת מי עדכן ומתי. הסרה מסמנת את ההערה כלא פעילה, מסתירה אותה מהרשימה ומשאירה את הטקסט ביומן. יומן הביקורת רושם `NOTE_CREATED`, `NOTE_UPDATED` ו-`NOTE_DEACTIVATED`. אין שיוך לפרופיל או להרשאה, ואין שדה נראות. ההערות לא מוצגות בהרשאות שלי.

היסטוריית העובד נקראת מיומן הביקורת בלבד, 50 שורות בעמוד, מהחדש לישן לפי זמן ואז מזהה. שורת מצביע על העובד לא מוצגת כשאותה פעולה כבר רשומה על ההרשאה, הפרופיל או ההערה. פתיחת חידוש מוצגת פעם אחת, על שורת הילד. קטלוג, תבניות ותפקידי מערכת לא נכנסים לכרטיס העובד. הקטגוריות הן הרשאות, פרופילים, חידושים, שינויים ארגוניים והערות. אפשר לסנן לפי תאריך ולחפש בכותרת, בהרשאה, בפרופיל, במבצע ובסיבה. פעולת מתזמן מוצגת כמערכת. דחייה, הגשה מחדש וחריגת מנהל נשארות אירועים נפרדים עם הסיבה. שינוי ארגוני מוצג כאירוע אחד עם נוסח המחלקה, התפקיד או המשרה. הערות מופיעות בלי גוף ההערה. ציר הזמן אינו הסטטוס הנוכחי. בהרשאות שלי מוצגים רק אירועי הרשאה וחידוש.

התראות נשמרות ב-`DoctorPermissionNotifications`, שורה אחת לכל הקצאה, נמען, סוג, יום וערוץ. הסוגים הם בקשה ראשונה, תזכורת, הסלמה, חידוש, והרשאה עומדת לפוג. הערוצים הם דוא"ל ו-SMS. העמוד `#/doctors-permissions/notifications` מציג למנהל מערכת 50 שורות, עם סינון לפי ערוץ, סטטוס, אירוע, תאריך וחיפוש. הסטטוסים הם ממתין, נשלח, נכשל ודולג. נשלח פירושו שהשולח הקיים קיבל את ההודעה. כשל לא משנה את סטטוס ההרשאה. שליחה מחדש מעדכנת את אותה שורה שנכשלה, עד שלושה ניסיונות, ולא פותחת שורה נוספת. נוסח ההודעה נבנה בזמן השליחה ואינו נשמר. התראות לא נכנסות לציר ההיסטוריה של העובד.

הגדרות המערכת נמצאות ב-`#/doctors-permissions/settings` למנהל מערכת. תוקף וחידוש נשארים על כל הרשאה בקטלוג, והאישור משתמש בערך שבתוקף בזמן האישור. שינוי בקטלוג לא משכתב תאריכי פקיעה קיימים. חלון חידוש שלילי נשאר שלושה חודשים במסכים ואפס במשימה האוטומטית. `DoctorPermissionSettings` שומר רק את `ApprovalDelayWarningDays`, ברירת מחדל 14, בטווח 0 עד 365. החיפוש, לוח הבקרה ותור האישורים קוראים את אותו מספר ומסמנים ממתינים בלבד, בלי לשנות סטטוס. שמירה בלי שינוי לא מוסיפה שורת ביקורת. שינוי נרשם פעם אחת כ-`SETTINGS_UPDATED` על ישות `Settings`, לא על עובד. כללי התזכורת הקיימים נשארים חמישה: יום, פעיל וערוץ `EMAIL`, `SMS` או `BOTH`. לא מוסיפים כלל ולא משנים מכאן כתובת דואר או ספק SMS. כיבוי כלל לא מוחק שורות התראה שכבר נוצרו. השינוי חל מהשמירה ואילך.

המסכים בעברית ובכיוון ימין לשמאל. כותרת, סינון ותוכן חוזרים בכל עמוד. לוח הבקרה וכרטיס העובד נשארים ברוחב הרגיל, חיפוש, קטלוג, תור, התראות ושינויים ארגוניים רחבים יותר, וההגדרות צרות יותר לקריאה. מתחת ל-860 פיקסלים טבלאות הופכות לכרטיסים. התגים המשותפים מציגים טקסט בעברית יחד עם הצבע: מאושר בירוק, ממתין בכתום, טיוטה באפור, נדחה באדום, פג תוקף באדום כהה, מושעה בכתום, בוטל באפור, וחידוש בכחול בנפרד מהסטטוס. טעינה היא שלד, רשימה ריקה מסבירה מה חסר, ושגיאה מציעה `נסו שוב` בלי פירוט טכני. כתובת דוא"ל, טלפון וקוד מוצגים משמאל לימין בתוך הכרטיס. תאריכים מוצגים כ-`08/10/2026` ושעה כ-`08/10/2026 10:30`.

ההרשאות שלי נמצאות ב-`#/doctors-permissions/my` ונטענות לעובד המחובר בלי מזהה מהדפדפן. ההרשאות מקובצות לפי פרופיל. הסיכום סופר פרופילים פעילים בלבד ובאותם כללי סטטוס של שאר המסכים: פעילות, ממתינות, עומדות לפוג, נדחו ופגו. חידוש ממתין או נדחה מוצג על כרטיס ההורה, וההורה נשאר בתוקף עד תאריך הפקיעה. שורת ילד שאינה עצמה בתוקף, והורה שכבר הוחלף בחידוש שאושר, לא מופיעים ברשימת הכל. דחייה מציגה סיבה, תאריך ושם. אין הגשה מחדש ממסך זה. פרופילים סגורים נשארים מכווצים תחת פרופילים קודמים ואינם נספרים בסיכום. היסטוריה נטענת רק כשפותחים אותה.

שינוי ארגוני מזוהה מול תמונת מצב של מחלקה, תפקיד ומשרה. עובד בלי תמונת מצב מקבל שורה ראשונה בלי אירוע שינוי. עובד שסיים עבודה יוצא מההשוואה וההיסטוריה שלו נשמרת. כל שדה שהשתנה נרשם עם הערך הקודם והחדש, והעיבוד רץ פעם אחת על המצב הנוכחי יחד. פרופיל פעיל מזוהה רק כשמחלקה, תפקיד ומשרה תואמים. פרופיל אחר לא נסגר ולא משתנה. תבנית אחת מתאימה יוצרת פרופיל או מוסיפה הרשאות חובה חסרות. שתי תבניות באותה רמת התאמה, או היעדר תבנית, נשארים לבדיקה ידנית. הרצה חוזרת בלי שינוי חדש לא מוסיפה אירוע, פרופיל או הרשאה. הרשימה נמצאת ב-`#/doctors-permissions/organizational-changes`.

חידוש נפתח אוטומטית להרשאה `APPROVED` בפרופיל פעיל כשתאריך הפקיעה קיים והיום נמצא בין `ExpirationDate` פחות `RenewalLeadMonths` לבין תאריך הפקיעה. חלון שלילי נספר כאפס. נוצרת שורת ילד אחת ב-`PENDING_APPROVAL` עם `RenewalSourceId`, בלי לאשר אותה ובלי לשנות את ההורה. הרצה חוזרת, ילד שנדחה, או ילד שכבר אושר לא יוצרים ילד נוסף. כל פרופיל הוא שרשרת נפרדת. כל עוד החידוש ממתין או נדחה, ההורה נשאר בתוקף עד תאריך הפקיעה שלו. אחרי אישור, התוקף החדש מחושב מ-`DefaultValidityMonths` הנוכחי, וההורה יוצא מספירת ההרשאות הפעילות. פרופיל סגור לא מקבל חידוש. כשל בשליחת הודעה לא מוחק את שורת החידוש.

דחייה דורשת סיבה ונשמרת ב-`DoctorPermissionApprovalActions` עם המבצע והתאריך. ההרשאה נשארת `REJECTED` עד הגשה מחדש מפורשת על אותה שורה. ההגשה מחזירה אותה ל-`PENDING_APPROVAL`, מוחקת את הסיבה מהשורה הנוכחית, ומשאירה את הדחייה בהיסטוריה. אפשר לדחות ולהגיש שוב כמה פעמים. זמן ההמתנה בתור נספר מהגשת המחדש האחרונה, לא מתאריך היצירה. ילד חידוש שנדחה חוזר לאותה שורת חידוש. הורה שעדיין בתוקף נשאר מאושר.

תור האישורים נמצא ב-`#/doctors-permissions/approvals`. כרטיס הממתינות בלוח נפתח אליו. הרשימה היא 50 שורות, מהישן לחדש, ורק הרשאות `PENDING_APPROVAL` בפרופיל פעיל שהקורא רשאי לאשר, בלי ההרשאות של עצמו. הסינון הוא עובד, מחלקה, פרופיל, הרשאה, טווח המתנה, והבחנה בין הרשאה חדשה לחידוש. אישור קובע תאריך אישור ותוקף לפי `DefaultValidityMonths` הנוכחי. דחייה דורשת סיבה. אישור מרובה הוא קריאה אחת; שורה שכבר טופלה לא מבטלת את השאר. חידוש מעדכן את שורת הילד בלבד. אם השורה כבר לא ממתינה מוחזר "ההרשאה כבר טופלה על ידי משתמש אחר." כל פעולה נרשמת ב-`DoctorPermissionApprovalActions` ובביקורת של העובד. במובייל השורות מוצגות ככרטיסים.

מסך האישורים מציג עובד, מחלקה, פרופיל, הרשאה, יום יצירה וימי המתנה. אפשר לסנן לפי טקסט, מחלקה, הרשאה, שם פרופיל ומספר ימי המתנה. דחייה דורשת סיבה. הכפתור נשאר חסום עד שהתור נטען מחדש. הגשה מחדש מוסיפה שורת `RESUBMIT` ב-`DoctorPermissionApprovalActions` וב-`DoctorPermissionAuditLog` ולא מוחקת את שורת הדחייה.

כשיש חידוש פתוח מוצג "חידוש ממתין, ההרשאה בתוקף". השורה המאושרת נשארת `APPROVED` עד `ExpirationDate`. המסך שלי מציג את אותן שורות בלי כפתורי ניהול.

היסטוריה מוצגת כ-`dd/MM/yyyy HH:mm` מתוך `PerformedAt`, בלי המרת אזור זמן.

לוח HR מציג שינויים ארגוניים: שם, סוג, ערך ישן, ערך חדש, זמן זיהוי, וקישור לכרטיס. ניהול מציג יומן שליחה: נמען, ערוץ, סוג, סטטוס, זמן וסיבת כשל. בלי כתובת, שרת דואר או מפתח מתזמן. שתי הקריאות דורשות `ADMIN`.

בקטלוג יש סינון טקסט, ושמירה נחסמת כשחלון החידוש גדול או שווה לתוקף. בתבנית אפשר לסנן את רשימת ההרשאות לפי שם.

## הרשאה בשרת

מזהה עובד שמגיע מהדפדפן לא קובע מי הקורא. הקורא נפתר בשרת מזהות Windows המאומתת של הבקשה (`HttpContext.User.Identity`), משם ל-`ADUserName`, ומשם ל-`EP_Employees.EmployeeID` של עובד פעיל (`EndWorkDate` ריק). שדה `userId` בגוף הבקשה לא נקרא. אם אין זהות מאומתת, או שאין בדיוק עובד פעיל אחד עם אותו `ADUserName`, הקריאה נדחית.

אחרי זיהוי הקורא, ההיקף נשאר:

- עובד: רק את עצמו
- מנהל ישיר: `ManagerID1` = המשתמש
- מנהל עקיף: `ManagerID2` = המשתמש, וגם עובדים שהמנהל הישיר שלהם כפוף למשתמש (רמה אחת)
- מנהל מחלקה: שורה ב-`DoctorPermissionUserRoles` עם `DEPARTMENT_MANAGER` ו-`DepartnentCode`
- מנהל מערכת: `ADMIN` באותה טבלה

עובד לא מאשר הרשאה של עצמו. דחייה נשארת דחייה עד `DpResubmitPermission`. חריגת מנהל דורשת סיבה ונכתבת ל-`DoctorPermissionAuditLog` ול-`DoctorPermissionApprovalActions`.

## טבלאות

`DoctorPermissions`, `DoctorPermissionProfileTemplates`, `DoctorPermissionProfileTemplateItems`, `DoctorEmployeeProfiles`, `DoctorEmployeeProfilePermissions`, `DoctorPermissionApprovalActions`, `DoctorEmployeeNotes`, `DoctorEmployeeOrganizationalChanges`, `DoctorEmployeeOrgSnapshot`, `DoctorPermissionNotifications`, `DoctorPermissionNotificationRules`, `DoctorPermissionAuditLog`, `DoctorPermissionUserRoles`.

`EP_Employees` ו-`EP_Departnents` לא משתנים. תוקף ברירת מחדל 36 חודשים, חלון חידוש 3 חודשים, על רשומת ההרשאה בקטלוג.

## API

`POST {environment.url}Dp...` עם גוף JSON. התשובה היא מחרוזת `{ ok, error, data }` בתוך `d`.

`DpGetAccessContext`, `DpSearchEmployees`, `DpGetEmployee`, `DpGetMyPermissions`, `DpGetPendingApprovals`, `DpApprovePermission`, `DpRejectPermission`, `DpBulkApprove`, `DpResubmitPermission`, `DpAdminOverride`, `DpGetPermissionCatalog`, `DpSavePermission`, `DpGetProfileTemplates`, `DpSaveProfileTemplate`, `DpSaveEmployeeProfile`, `DpAddProfilePermission`, `DpRemoveProfilePermission`, `DpGetDashboard`, `DpGetDepartmentGaps`, `DpGetHistory`, `DpGetNotes`, `DpSaveNote`, `DpGetSettings`, `DpSaveUserRole`, `DpGetOrganizationalChanges`, `DpGetNotifications`, `DpRetryNotification`, `DpProcessScheduledJobs`.

שמירות של קטלוג, תבנית, פרופיל, הערה ותפקיד שולחות `payload` כמחרוזת JSON.

## עיבוד מתוזמן

אין Hangfire. מתזמן חיצוני קורא:

`WebService.asmx/DpProcessScheduledJobs`

עם `jobKey` שתואם ל-`DoctorPermissions.JobKey`. מפתח ריק בקונפיגורציה לא מאמת. מפתח שגוי לא מאמת. בנתיב המפתח רשומות הביקורת נכתבות כ-`SYSTEM_JOB`.

מנהל מערכת מחובר ב-Windows יכול להפעיל את אותה מתודה בלי מפתח. הקורא נפתר מהזהות המאומתת, וחייבת להיות לו שורת `ADMIN` פעילה. עובד רגיל וקורא אנונימי נדחים. `userId` בגוף לא מעניק הרשאה.

תשובת `DpProcessScheduledJobs` כוללת `baselined`, `orgChanges`, `expired`, `renewals`, `notificationsSent`, `notificationsFailed`.

- פקיעה: עד 500 הרשאות `APPROVED` ש-`ExpirationDate` שלהן עבר עוברות ל-`EXPIRED`
- חידוש: `ExpirationDate = ApprovalDate + DefaultValidityMonths`. בקשה נפתחת כש-`ExpirationDate` עדיין בעתיד ובתוך `RenewalLeadMonths` (ברירת מחדל 36 ו-3, כלומר מחודש 33). נוצרת שורת `PENDING_APPROVAL` עם `RenewalSourceId`. השורה המאושרת לא משתנה. ילד שלא בוטל חוסם חידוש שני
- בסיס ארגוני: כל עובד פעיל בלי שורה ב-`DoctorEmployeeOrgSnapshot` מקבל שורה אחת. זה לא אירוע שינוי. `baselined` הוא מספר השורות שנוספו
- שינוי: רק עובד שכבר יש לו snapshot ושונה `DepartnentCode` או `FunctionID` או `JobTitleID`. עד 500 שינויים בהרצה. אותה טרנזקציה מעדכנת את ה-snapshot, אז הרצה חוזרת לא פותחת את אותו אירוע. עובד שעזב (`EndWorkDate` מלא) לא נכנס להשוואה ולא מייצר שינוי מחלקה מזויף. כשל בעובד אחד נרשם בלוג ולא עוצר את השאר
- תזכורות לפי `DoctorPermissionNotificationRules`. מפתח ייחודי מונע שליחה כפולה. כשל נשמר ב-`FailureReason`, עד 3 ניסיונות

דוא"ל דרך `SmtpClient`. SMS דרך `Sms.sendSms`.

## CSRF

שינוי מצב (`approve`, `reject`, `bulk`, `resubmit`, הערות, תבניות, קטלוג, תפקידים, חריגה, והפעלת העיבוד מהדפדפן) הוא `POST` עם `Content-Type: application/json` ו-`withCredentials`. אתר זר לא משלים קריאה כזו כל עוד CORS הוא `*` יחד עם credentials. אין טוקן anti-forgery נפרד. המתזמן קורא עם `jobKey` ולא דרך הדפדפן.

## סדר עלייה

### קוד

1. לפרוס את `RFC` (`App_Code/DoctorPermissions`, מתודות `Dp*` ב-`WebService.cs`, `<authentication mode="Windows" />`).
2. לפרוס את בניית Angular. הקריאות נשארות אל `environment.url`.

### מסד

3. להריץ [`sql/001_doctor_permissions.sql`](sql/001_doctor_permissions.sql) על `NAMER`.
4. להריץ את ה-`INSERT` של מנהל המערכת המוערם בסוף הסקריפט, עם `EmployeeID` אמיתי ופעיל.
5. להריץ [`sql/002_onnline_menu.sql`](sql/002_onnline_menu.sql) על `OnnLine`. הקישור העליון מוסתר עד `LinksPermissions`: `LinkRowId = doctors-permissions`, `UserId` = `ADUserName`.

### IIS

6. לוודא Windows Authentication דלוק על `RCF_WS`, ו-Anonymous נשאר דלוק לשאר המתודות.
7. למחזר את אתר `RFC`.

### קונפיגורציה

8. לוודא `NAMER_DB`, `DoctorPermissions.SmtpHost`, `DoctorPermissions.MailFrom`.
9. להשאיר `DoctorPermissions.JobKey` ריק עד שמתזמן חיצוני צריך מפתח. מפתח ריק לא מאמת. לא לשמור מפתח אמיתי ב-git ולא לכתוב אותו ללוג. ההשוואה היא תו-תו, בלי חיתוך רווחים ובלי התעלמות מרישיות.

### בדיקת ריצה ראשונה

השלבים האלה דורשים IIS, SQL ומסד שכבר הורצו. הם לא בוצעו מתוך הפיתוח.

1. להיכנס ל-Windows עם העובד שיהיה מנהל המערכת הראשון.
2. לפתוח את האפליקציה כרגיל מ-`http://srv-apps-prod`.
3. לעבור אל `#/doctors-permissions`.
4. לוודא שלוח המנהל נטען.
5. לוודא בלוג `outcome=resolved` עבור החשבון שלו.
6. לחפש עובד מותר.
7. לפתוח את כרטיס העובד.
8. להפעיל `DpProcessScheduledJobs` כמנהל המערכת המזוהה, בלי `userId`.
9. ריצה ראשונה כשיש עובדים פעילים בלי snapshot: `orgChanges = 0` ו-`baselined > 0`.
10. ריצה שנייה בלי שינוי ב-`EP_Employees`: `orgChanges = 0` ו-`baselined = 0`.
11. להיכנס כמנהל ישיר ולוודא שהוא רואה עובד ש-`ManagerID1` שלו הוא הוא.
12. להיכנס כעובד רגיל ולוודא שהוא רואה רק את עצמו.
13. לבקש כרטיס של עובד מחוץ להיקף ולוודא דחייה.

## בדיקה ידנית מלאה

צריך ארבעה עובדים פעילים (`EndWorkDate` ריק):

1. עובד רגיל, בלי `ManagerID1`/`ManagerID2` שמצביעים אליו ובלי שורת תפקיד.
2. מנהל ישיר: `ManagerID1` של העובד שווה ל-`EmployeeID` שלו.
3. מנהל עקיף: `ManagerID2` של העובד שווה ל-`EmployeeID` שלו, או שהוא `ManagerID1` של המנהל הישיר.
4. מנהל מערכת: שורת `ADMIN` פעילה.

לכל אחד גם `LinksPermissions` אם בודקים את התפריט. כתובת ישירה `#/doctors-permissions` עדיין דורשת שהשרת יאשר את הנתונים.

### עובד

- `#/doctors-permissions` מציג את ההרשאות שלו.
- שינוי `employeeId` בקריאה ל-`DpGetEmployee` לעובד אחר מחזיר "אין לך הרשאה לצפות בעובד זה".

### מנהל ישיר

- חיפוש מציג רק עובדים ש-`ManagerID1` שלהם הוא הוא.
- אישור הרשאה ממתינה, ואז דחייה של הרשאה אחרת עם סיבה.
- כפתור האישור נשאר חסום עד שהרשימה נטענת מחדש. קריאה שנייה על אותה הרשאה מחזירה "ההרשאה כבר אושרה".

### מנהל עקיף

- רואה עובד ש-`ManagerID2` שלו הוא הוא.
- רואה עובד שהמנהל הישיר שלו כפוף לו ברמה אחת.
- לא רואה עובד מחוץ לשרשרת.

### מנהל מערכת

- רואה את כל העובדים הפעילים, קטלוג, תבניות, לוח HR וניהול.
- יוצר הרשאה בקטלוג ופרופיל מחלקה.
- יוצר לעובד שני פרופילים. ההרשאות של פרופיל אחד לא מופיעות בשני.
- בפרופיל אחד: הרשאה מאושרת, הרשאה נדחית, והרשאה ממתינה. הדחייה נשארת דחייה אחרי עיבוד מתוזמן.
- חריגה בלי סיבה נדחית. חריגה עם סיבה נראית בהיסטוריה של העובד כ"חריגת מנהל".

### עיבוד מתוזמן

- ריצה ראשונה: `orgChanges = 0`, ואין שורות חדשות ב-`DoctorEmployeeOrganizationalChanges` רק בגלל יצירת snapshot.
- לשנות במחלקת בדיקה שדה אחד (`DepartnentCode` או `FunctionID` או `JobTitleID`) לעובד פעיל שכבר יש לו snapshot.
- ריצה שנייה: אירוע אחד לאותו שדה. ריצה שלישית בלי שינוי נוסף לא מוסיפה את אותו אירוע.
- עובד עם `EndWorkDate` לא מייצר אירוע מחלקה.

### חידוש

- לאשר הרשאה. `ExpirationDate` הוא תאריך האישור ועוד `DefaultValidityMonths`.
- לעדכן בבדיקה את `ExpirationDate` לתאריך בתוך `RenewalLeadMonths` מהיום, ועדיין בעתיד.
- להריץ את העיבוד. נוצרת בקשת `PENDING_APPROVAL` עם `RenewalSourceId`, והשורה המאושרת נשארת `APPROVED`.
- הרצה נוספת לא יוצרת בקשה שנייה.

### התראות

לא לשלוח SMS או דואר אמיתי אם השער לא מיועד לבדיקה. להכניס כתובת ריקה או מספר לא תקין ולוודא שורת `DoctorPermissionNotifications` עם `FAILED` או `SKIPPED` ו-`FailureReason`, ושריצה חוזרת לא פותחת חריץ שכבר סומן `SENT`.

## בדיקות זהות

הבדיקות האלה נשענות על הקוד. הן לא הורצו בדפדפן.

- עובד A שולח `userId` של עובד B, או משמיט את השדה: הקורא נשאר A, לפי זהות Windows.
- עובד רגיל שולח `userId` של מנהל מערכת: אין הרשאת מנהל.
- עובד A מבקש את עובד B כיעד: נדחה, אלא אם ההיררכיה מתירה.
- מנהל ישיר מזוהה ניגש לעובד ש-`ManagerID1` שלו הוא הוא: מותר.
- מנהל מזוהה ניגש לעובד מחוץ לשרשרת: נדחה.
- עובד עם שורת `ADMIN` פעילה ניגש למסך ניהול: מותר.
- מי שאינו מנהל שולח את מזהה המנהל בבקשה: נדחה.
- מנהל מערכת מזוהה מפעיל את העיבוד: מותר. הביקורת נושאת את `EmployeeID` שלו.
- עובד רגיל מפעיל את העיבוד: נדחה.
- `jobKey` תואם למפתח לא-ריק: מותר. הביקורת היא `SYSTEM_JOB`.
- `jobKey` שגוי, בלי מנהל מערכת מזוהה: נדחה.
- המפתח בקונפיגורציה ריק: אימות לפי מפתח לא זמין.

## מה נשאר לסביבה

- SQL לא הורץ על `NAMER` או `OnnLine` מתוך הפיתוח.
- אין session של Windows Authentication אמיתי כאן, והמסכים לא נבדקו בדפדפן.
- אם Anonymous מנצח על הבקשה, המודול נדחה. זה תלוי בהגדרת IIS ולא בקוד.
- SMS ודוא"ל לא הוכחו מול השער. כשל נשמר ב-`DoctorPermissionNotifications`.

## Final handover

| Item | Value |
|---|---|
| Module status | Development phases 1–20 complete. Not executed against NAMER in this work |
| What it does | Profiles, catalog, templates, approval, rejection, resubmit, renewal, organizational changes, My Permissions, notes, history, notifications, one delay setting |
| Frontend | `src/app/doctors-permissions/` |
| Backend | `App_Code/DoctorPermissions/` and `Dp*` methods on `WebService.asmx` |
| SQL | `docs/doctor-permissions/sql/001_doctor_permissions.sql`, `002_onnline_menu.sql` |
| Route | `#/doctors-permissions` |
| Last Angular check | Non-production build, hash `c7ef659e9791e6ae1d59`, 2026-10-08, exit 0 |
| Not done | C# compile, SQL execution, browser pass, live approve/renewal/org run |

Smoke test after the scripts are applied: open the dashboard, search an employee, open the employee card, open the queue, open My Permissions, open history and notes on an employee, open notifications, open settings. Confirm a pending renewal is not a second active permission.

There is no further development phase.
