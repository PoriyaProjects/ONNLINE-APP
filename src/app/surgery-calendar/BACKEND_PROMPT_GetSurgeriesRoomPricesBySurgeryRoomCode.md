# Backend: `GetSurgeriesRoomPricesBySurgeryRoomCode`

## `DepartmentDayAverage` returns `0` even when history exists

The final SELECT uses:

```sql
CASE WHEN c.DeptCnt = 1 AND c.RoomGrossPriceTotal > 0
     THEN ISNULL(d.DepartmentDayAverage, 0)
     ELSE 0
END AS DepartmentDayAverage
```

`DeptCnt` is the number of distinct `RequestedDepartmentDetails` in the room **on the requested day**.

If more than one department is scheduled in the same physical room today (for example `פז01-204`), the API always returns `DepartmentDayAverage = 0`, even when `DepartmentAvg` has a valid 6-month average for ophthalmology in that room.

Example from production-like data:

| SurgeryRoom | RoomGrossPriceTotal | DepartmentDayAverage |
|-------------|---------------------|----------------------|
| פז01-204    | 275804              | 0                    |
| פז01-201    | 95900               | 64712                |

The UI compares today's room income against the department benchmark. Returning `0` when `DeptCnt > 1` hides the benchmark and makes virtual rooms fall back to the wrong room summary.

## Virtual vs physical rooms

- Virtual surgeries are stored under `SurgeryRoomDetails` like `ור01-104`.
- Physical paired room is `פז01-204` (virtual `01-1xx` maps to physical `01-2xx`).
- `DepartmentAvg` is calculated per `SurgeryRoomDetails + DepartmentCode`.
- A virtual room and its physical pair have **separate** histories, so `ור01-104` and `פז01-204` return different averages.

For virtual planning boards, the benchmark should come from the **paired physical room** and the **department operating in the virtual room today**.

## Suggested SQL change

When the room has a single department today, keep current behaviour.

When multiple departments exist today, still allow the benchmark for the department that is alone in the virtual board / primary department for the row:

```sql
, CurrentDay AS (
    SELECT
        SurgeryRoomDetails,
        DeptCnt,
        DepartmentCode,
        DailyIncome AS RoomGrossPriceTotal
    FROM DayRoom
    WHERE WorkDate = @FullDate
)
SELECT
    c.SurgeryRoomDetails AS SurgeryRoom,
    CAST(c.RoomGrossPriceTotal AS decimal(18,0)) AS RoomGrossPriceTotal,
    CASE
        WHEN c.RoomGrossPriceTotal > 0 AND c.DeptCnt = 1
            THEN ISNULL(d.DepartmentDayAverage, 0)
        ELSE 0
    END AS DepartmentDayAverage
FROM CurrentDay c
LEFT JOIN DepartmentAvg d
    ON d.SurgeryRoomDetails = c.SurgeryRoomDetails
   AND d.DepartmentCode = c.DepartmentCode
```

Optional enhancement for virtual boards: accept `RequestedDepartment` and match `DepartmentAvg` by department even when `DeptCnt > 1`, or map virtual room to physical room in `SurgeriesRoomDesc` and read the physical room average.

## Frontend expectations

- Physical board calls with `RoomGroupDesc = N'חדר ניתוח כללי'`.
- Virtual board calls with `RoomGroupDesc = N'וירטואלי כללי'` for surgery prices and also loads `חדר ניתוח כללי` for benchmarks.
- `SurgeryRoom` values are returned as `פז01-204` / `ור01-104` (no spaces).
- `DepartmentDayAverage = 0` is treated as “no benchmark” in the UI.
