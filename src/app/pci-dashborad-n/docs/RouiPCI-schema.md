# RouiPCI — מקור נתונים לדשבורד צינתורים

**טבלה:** `NAMER.dbo.RouiPCI`  
**Angular:** `/#/pciDashboard`

## עמודות (מהשאילתה)

| עמודה | שימוש בדשבורד |
|--------|----------------|
| שנה | סינון/אגרגציה לפי שנה |
| מספר מקרה | caseNumber |
| מספר ניתוח | surgeryNumber |
| תאריך ניתוח | date, חודש (YTD) |
| קוד פרוצדורה | פילטר/פירוט |
| פרוצדורה | procedure |
| השלמת כניסה / השלמת יציאה | מדדי זמן |
| כניסה נקי / יציאה נקי | מדדי זמן |
| מנתח אחראי | surgeon / Doctor |
| סך הכנסות נטו נומינלי | totalAmount / הכנסות |
| שם שירות לחיוב | procedure / revenue |
| סוף / אמצע שבוע | weekdayOrWeekend (אמצ"ש) |
| יום בשבוע | פילטר |
| משמרת | shift |
| סוג ניתוח | surgeryType / UnifiedSurgeryType |
| KerenOfHos | FundType / payer |
| יחידה | requestingUnit (צנתורים, אלקטרופיזיולוגיה…) |
| מחלקה | department / Wing |
| תאריכי כניסה/הרדמה/ניתוח/יציאה/התאוששות | מדדי זמני חדר |
| ממוצע לפי פעולה | משך ממוצע |
| חדר ניתוח | surgeryRoom |
| קוד חיוב | revenue |
| זמן חדר | surgeryDurationMinutes |
| סוג ניתוח קמיליון | unifiedSurgeryType |
| SurgeryKey | מפתח ייחודי |

## שאילתת בסיס

```sql
SELECT *
FROM [NAMER].[dbo].[RouiPCI] WITH (NOLOCK)
ORDER BY [השלמת כניסה] DESC;
```

## טבלת מיפוי (אקסל)

התמונה המצורפת — מיפוי פעולה לחיוב / רופא / מחלקה / יחידה / הכללה.  
לחיבור עתידי: JOIN לפי `פרוצדורה` או `קוד פרוצדורה` + `מנתח אחראי`.
