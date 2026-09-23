using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Mail;
  using System.Text;
/// <summary>
/// Summary description for Class1
/// </summary>
public class SurgeriesCalendar
{

    public class SurgeryRooms
    {
        public string SurgeryRoom { get; set; }
        public string SurgeryRoomDesc { get; set; }
        public string DisplayOrder { get; set; }
        public string RoomGroupDesc { get; set; }
        public string GroupOrder { get; set; }
        public string ShortRoomGroupDesc { get; set; }
        public string CalendarDisplay { get; set; }
        public string CalendarRoomsArea { get; set; }
        public string NumberOfSurgeries { get; set; }
        public string S_DEPARTMENT_NAME { get; set; }
        public string ArrivalDate { get; set; }
        public string Color { get; set; }
    }
    public class SurgeryRoomsArea
    {
        public string CalendarRoomsArea { get; set; }
        public List<SurgeryRooms> SurgeryRooms { get; set; }
        public string NumberOfSurgeries { get; set; }
        public string S_DEPARTMENT_NAME { get; set; }
        public string ArrivalDate { get; set; }
        public string Color { get; set; }
    }
    public class SurgeryRequestDepartments
    {
        public string SD_ROW_ID { get; set; }
        public string S_DEPARTMENT { get; set; }
        public string S_DEPARTMENT_NAME { get; set; }
        public string SD_Priority { get; set; }
        public string S_DEPARTMENT_SHORT_DESC { get; set; }
    }
    public class SurgeryPatientDetails
    {
        public string PM_ROW_ID { get; set; }
        public string PM_CASE_NUMBER { get; set; }
        public string PM_PATIENT_GENDER { get; set; }
        public string SurgeriesCalendarIDFK { get; set; }
        public string PM_LAST_NAME { get; set; }
        public string PM_FIRST_NAME { get; set; }
        public string PM_DOB { get; set; }
        public string PM_PATIENT_ID { get; set; }
        public string RECORD_EXISTS { get; set; }
    }
    public class SurgeriesCalendarClass
    {
        public string Row_ID { get; set; }
        public string PatientID { get; set; }
        public string SurgeryType { get; set; }
        public string ArrivalDate { get; set; }
        public string EndDate { get; set; }
        public string SurgeryStatus { get; set; }
        public string ArrivalTime { get; set; }
        public string EndTime { get; set; }
        public string LastUpdateUserName { get; set; }
        public SurgeryRooms SurgeryRooms { get; set; }
        public string SurgeryRoom { get; set; }
        public string SurgeryRoomName { get; set; }
        public string DoctorSurgeon { get; set; }
        public string WithAnesthesia { get; set; }
        public string S_DEPARTMENT { get; set; }
        public string Duration { get; set; }
        public string AvgDauration { get; set; }
        public string Urgency { get; set; }
        public string BLOOD_BANK { get; set; }
        public string NoteType { get; set; }
        public string NoteTypeRequest { get; set; }
        public SurgeriesFixedNotes SurgeryTypeReason { get; set; }
        public SurgeriesFixedNotes SurgeryTypeReasonRequest { get; set; }
        public string SurgeryReasonNote { get; set; }
        public string SurgeryReasonNoteRequest { get; set; }
        public SurgeryRequestDepartments SurgeryRequestDepartments { get; set; }
        public List<SurgeriesCalendar_Susgeries> SurgeriesCalendar_Susgeries { get; set; }
        public List<SurgeriesCalendar_Service> SurgeriesCalendar_Service { get; set; }
        public List<SurgeriesCalendar_Tools> SurgeriesCalendar_Tools { get; set; }
        public SurgeryPatientDetails SurgeryPatientDetails { get; set; }
        public AdditionalDetails AdditionalDetails { get; set; }
    }
    public class SurgeryPriceItem
    {
        public string Row_ID { get; set; }
        public bool IsEstimated { get; set; }
        public List<ServiceCodePrice> Codes { get; set; }

        public SurgeryPriceItem()
        {
            Codes = new List<ServiceCodePrice>();
        }
    }

    public class ServiceCodePrice
    {
        public string ServiceCode { get; set; }
        public string GrossPrice { get; set; }
        public string ServiceName { get; set; }
    }

    // SurgeriesRoomDayClass — הוסף:
    public class SurgeriesRoomDayClass
    {
        public List<SurgeryRoomPriceSummary> RoomPriceSummaries { get; set; }
        public List<SurgeryPriceItem> SurgeryPrices { get; set; }

        public string RequestedDepartment { get; set; }
        public List<SurgeriesCalendarClass> SurgeriesCalendarClassList { get; set; }
    }
    public class SurgeriesFixedNotes
    {
        public string Row_ID { get; set; }
        public string Description { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }
        public string Type { get; set; }
        public string Section { get; set; }
    }
    public class SurgeriesCalendarUsersTypes
    {
        public string Row_ID { get; set; }
        public string UserName { get; set; }
        public string UserType { get; set; }
        public List<string> UserDepartment { get; set; }
    }
    public class AllSurgeryDetailsAndDepartments
    {
        public List<SurgeriesCalendar_Susgeries> surgeriesList { get; set; }
        public List<string> surgeonsList { get; set; }
        public List<SurgeryRequestDepartments> surgeryRequestDepartments { get; set; }
        public List<SurgeriesFixedNotes> surgeriesFixedNotes { get; set; }
    }
    public class AdditionalDetails
    {
        public string LAP_OR_OPEN { get; set; }
        public string SIDE { get; set; }
        public string LEYING_POSITION { get; set; }
        public string ISOLATION { get; set; }
        public string BLOOD_BANK { get; set; }
        public string NOTE { get; set; }
        public string TOOLS { get; set; }
        public string ANESTHESIA { get; set; }
        public string DIMOT { get; set; }
        public string HOSPITALIZATION { get; set; }
    }
    public class SurgeriesCalendar_Service
    {
        public string Row_ID { get; set; }
        public string Service_Name { get; set; }
        public string Service_Code { get; set; }
        public string SurgeriesCalendarIDFK { get; set; }
        public string ServiceNameIDFK { get; set; }
    }
    public class SurgeriesCalendar_Susgeries
    {
        public string Row_ID { get; set; }
        public string Surgery_Name { get; set; }
        public string Surgery_Code { get; set; }
        public string Side { get; set; }
        public string SurgeriesCalendarIDFK { get; set; }
        public string ServiceNameIDFK { get; set; }
        public string Duration { get; set; }
        public string SurgeryID { get; set; }
        public string AvgDauration { get; set; }
        public string Depart { get; set; }
        public string DrorDuration { get; set; }
    }
    public class SurgeriesCalendar_Tools
    {
        public string Row_ID { get; set; }
        public string Tool_Name { get; set; }
        public string Tool_Code { get; set; }
        public string Tool_Need { get; set; }
        public string SurgeriesCalendarIDFK { get; set; }
    }
    public class SurgeriesCalendar_Employees
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string id { get; set; }
        public string Email { get; set; }
    }
    public class SurgeriesExcelFile
    {
        public string casenumber { get; set; }
        public string room { get; set; }
        public string id { get; set; }
        public string age { get; set; }
        public string code { get; set; }
        public string s_name { get; set; }
        public string side { get; set; }
        public string position { get; set; }
        public string isolation { get; set; }
        public string blood { get; set; }
        public string doctor { get; set; }
        public string note { get; set; }
        public string id2 { get; set; }
        public string tools { get; set; }
        public string anesthesia { get; set; }
        public string dimot { get; set; }
        public string hospitalization { get; set; }
        public string duration { get; set; }
        public string AvgDauration { get; set; }
    }

    string connetionStringNAMER = "Data Source=SRV-APPDB;Initial Catalog=NAMER;User ID=hrd;Password=3*MFydzDx4%@#AS;";
    public class CalendarRoomsDoing
    {

        public string CalendarRoomsArea { get; set; }
        public string SurgeryRoom { get; set; }
        public string ArrivalDate { get; set; }
        public int Day { get; set; }
        public int TotalSurgeries { get; set; }
    }
    public class SurgeriesRoomsGroup
    {
        public string CalendarRoomsArea { get; set; }
        public string RoomDes { get; set; }
        public string Start { get; set; }
        public int CountSurgeryRoom { get; set; }
        public int TotalSurgeries { get; set; }
        public List<string> Rooms { get; set; }
    }
    public class CalendarRoomsDoingByMonth
    {

        public string CalendarRoomsArea { get; set; }
        public string ArrivalDate { get; set; }
        public int Day { get; set; }
        public int Virtual { get; set; }
        public int Physical { get; set; }
        public List<SurgeriesRoomsGroup> mSurgeriesRoomsGroup { get; set; }
    }
    public List<CalendarRoomsDoingByMonth> getSurgeryRooms(string _month, string _year)
    {
        List<SurgeriesRoomsGroup> mSurgeriesRoomsGroup = new List<SurgeriesRoomsGroup>();
        // Step 2: Get distinct room areas
        using (var connection = new SqlConnection(connetionStringNAMER))
        {
            var _query = @" 
    

    SELECT [CalendarRoomsArea],  LEFT([SurgeryRoom], 2) RoomDes, COUNT([SurgeryRoom]) CountSurgeryRoom
    FROM [NAMER].[dbo].[SurgeriesRoomDesc]
    WHERE CalendarDisplay = 1
    GROUP BY [CalendarRoomsArea], LEFT([SurgeryRoom], 2);

;";

            using (var command = new SqlCommand(_query, connection))
            {
                //command.Parameters.AddWithValue("@Years", yearsParameter);

                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        mSurgeriesRoomsGroup.Add(new SurgeriesRoomsGroup
                        {
                            CalendarRoomsArea = reader["CalendarRoomsArea"].ToString(),
                            RoomDes = reader["RoomDes"].ToString(),
                            CountSurgeryRoom = reader["CountSurgeryRoom"] == DBNull.Value ? 0 : Convert.ToInt32(reader["CountSurgeryRoom"]),
                            TotalSurgeries = 0,
                            Rooms = getRoomsForCalendarRoomsArea(reader["CalendarRoomsArea"].ToString(), reader["RoomDes"].ToString()),
                            Start = ""

                        });
                    }
                }
            }
        }
        List<CalendarRoomsDoingByMonth> mCalendarRoomsDoing = new List<CalendarRoomsDoingByMonth>();


        // Step 2: Get distinct room areas
        using (var connection = new SqlConnection(connetionStringNAMER))
        {
            var query = @" 
    

    SELECT 
    p.[CalendarRoomsArea],
    p.[ArrivalDate],
    p.[Day],
    ISNULL(p.[ור], 0) AS [Virtual],
    ISNULL(p.[פז], 0) AS [Physical]
    
FROM (
    SELECT 
        sr.[CalendarRoomsArea],
        FORMAT([ArrivalDate], 'yyyy-MM-dd') ArrivalDate,
        DAY([ArrivalDate]) AS [Day],
        LEFT([SurgeryRoom], 2) AS [RoomPrefix],
        COUNT(SurgeryID) AS [TotalSurgeries]
    FROM [NAMER].[dbo].[SurgeriesCalendar] sc WITH (NOLOCK)
    LEFT JOIN [NAMER].[dbo].[SurgeriesRoomDesc] sr WITH (NOLOCK)
        ON sc.[SurgeryRoomDetails] = sr.SurgeryRoom
    WHERE 
        --MONTH([ArrivalDate]) = '" + _month + @"' AND
         YEAR([ArrivalDate]) = '" + _year + @"'
        AND SurgeryStatus <> 'Canceled'
        AND [SurgeryRoomDetails] <> ''
        AND [SurgeryRoomDetails] IS NOT NULL
        AND CalendarDisplay = 1
    GROUP BY 
        sr.[CalendarRoomsArea],
        [ArrivalDate],
        DAY([ArrivalDate]),
        LEFT([SurgeryRoom], 2)
) AS src
PIVOT (
    SUM([TotalSurgeries])
    FOR [RoomPrefix] IN ([ור], [פז]) -- list all possible 2-letter prefixes here
) AS p
ORDER BY 
    p.[CalendarRoomsArea],
    p.[Day];

;";

            using (var command = new SqlCommand(query, connection))
            {
                //command.Parameters.AddWithValue("@Years", yearsParameter);

                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        mCalendarRoomsDoing.Add(new CalendarRoomsDoingByMonth
                        {
                            CalendarRoomsArea = reader["CalendarRoomsArea"].ToString().Trim(),
                            ArrivalDate = reader["ArrivalDate"].ToString().Trim(),
                            mSurgeriesRoomsGroup = mSurgeriesRoomsGroup,
                            Day = reader["Day"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Day"]),
                            Physical = reader["Physical"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Physical"]),
                            Virtual = reader["Virtual"] == DBNull.Value ? 0 : Convert.ToInt32(reader["Virtual"])
                        });
                    }
                }
            }
        }


        return mCalendarRoomsDoing;
    }




















    private List<string> getRoomsForCalendarRoomsArea(string Room, string RoomDes)
    {
        List<string> mRooms = new List<string>();
        using (var connection = new SqlConnection(connetionStringNAMER))
        {
            var _query = @" 
    

    SELECT [CalendarRoomsArea],  [SurgeryRoom] RoomDes
    FROM [NAMER].[dbo].[SurgeriesRoomDesc]
    WHERE CalendarDisplay = 1 AND CalendarRoomsArea = '" + Room + @"' AND SurgeryRoom LIKE '" + RoomDes + @"%'
   

;";

            using (var command = new SqlCommand(_query, connection))
            {
                //command.Parameters.AddWithValue("@Years", yearsParameter);

                connection.Open();
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        mRooms.Add(reader["RoomDes"].ToString().Trim());
                    }
                }
            }
        }
        return mRooms;
    }

    public List<object> OLD_getSurgeryRooms(string _month, string _year)
    {
        int month = int.Parse(_month);
        int year = int.Parse(_year);
        int daysInMonth = DateTime.DaysInMonth(year, month);

        var daysList = new List<object>();

        // Step 1: Load all surgeries room descriptions once
        DataTable roomsTable = new DataTable();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        using (SqlCommand cmd = new SqlCommand(@"
			SELECT [SurgeryRoom], [SurgeryRoomDesc], [DisplayOrder], [RoomGroupDesc],
				   [GroupOrder], [ShortRoomGroupDesc], [CalendarDisplay], [CalendarRoomsArea]
			FROM [NAMER].[dbo].[SurgeriesRoomDesc]
			WHERE [CalendarDisplay] = 1
			ORDER BY [CalendarRoomsOrder];", myConnection))
        {
            myConnection.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                roomsTable.Load(reader);
            }
        }

        // Step 2: Get distinct room areas
        var roomsList = roomsTable.AsEnumerable()
            .Select(r => r.Field<string>("CalendarRoomsArea").Trim())
            .Distinct()
            .ToList();

        // Step 3: Loop through each room once
        foreach (string room in roomsList)
        {
            var surgeryRoomsList = new List<SurgeryRoomsArea>();

            for (int day = 1; day <= daysInMonth; day++)
            {
                string dateToCount = string.Format("{0}-{1:D2}-{2:D2}", year, month, day);

                var area = new SurgeryRoomsArea
                {
                    CalendarRoomsArea = room,
                    Color = "linear-gradient(200deg, #c9c14b, #fafafa)",
                    ArrivalDate = dateToCount,
                    SurgeryRooms = new List<SurgeryRooms>()
                };

                // Get the room rows from cached data (no new DB query!)
                var surgeries = roomsTable.AsEnumerable()
                    .Where(r => r.Field<string>("CalendarRoomsArea").Trim() == room)
                    .ToList();

                foreach (var surgeryRow in surgeries)
                {
                    var roomData = new SurgeryRooms
                    {
                        SurgeryRoom = surgeryRow["SurgeryRoom"].ToString().Trim(),
                    };

                    // Fetch counts from helper if needed
                    roomData = GetNumberOfSurgeriesRoomCodeDate(roomData, dateToCount);
                    area.SurgeryRooms.Add(roomData);
                }

                surgeryRoomsList.Add(area);
            }

            daysList.Add(surgeryRoomsList);
        }

        return daysList;
    }

    public List<object> _getSurgeryRooms(string _month, string _year)
    {
        // Parse inputs
        int month = int.Parse(_month);
        int year = int.Parse(_year);
        int daysInMonth = DateTime.DaysInMonth(year, month);

        // List to hold the final result
        List<object> daysList = new List<object>();

        // Connection string for the database
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            // Step 1: Get the list of distinct rooms
            string roomsQuery = @"
            SELECT [CalendarRoomsArea]
            FROM [NAMER].[dbo].[SurgeriesRoomDesc]
            WHERE [CalendarDisplay] = 1
            GROUP BY [CalendarRoomsArea], [CalendarRoomsOrder]
            ORDER BY [CalendarRoomsOrder] ASC";

            List<string> roomsList = new List<string>();
            using (SqlCommand roomCmd = new SqlCommand(roomsQuery, myConnection))
            {
                myConnection.Open();
                using (SqlDataReader roomReader = roomCmd.ExecuteReader())
                {
                    while (roomReader.Read())
                    {
                        string room = roomReader["CalendarRoomsArea"].ToString().Trim();
                        roomsList.Add(room);
                    }
                }
                myConnection.Close();
            }

            // Step 2: Populate data for each room
            foreach (string room in roomsList)
            {
                List<SurgeryRoomsArea> surgeryRoomsList = new List<SurgeryRoomsArea>();

                for (int day = 1; day <= daysInMonth; day++)
                {
                    string dateToCount = String.Format("{0}-{1:D2}-{2:D2}", year, month, day);

                    // Create a new SurgeryRoomsArea object
                    SurgeryRoomsArea area = new SurgeryRoomsArea
                    {
                        CalendarRoomsArea = room,
                        Color = "linear-gradient(200deg, #c9c14b, #fafafa)",
                        ArrivalDate = String.Format("{0}-{1:D2}-{2:D2}", year, month, day),
                        SurgeryRooms = new List<SurgeryRooms>()
                    };

                    // Step 3: Fetch the surgeries for the current room and day
                    string surgeriesQuery = @"
                    SELECT [SurgeryRoom], [SurgeryRoomDesc], [DisplayOrder], [RoomGroupDesc],
                           [GroupOrder], [ShortRoomGroupDesc], [CalendarDisplay], [CalendarRoomsArea]
                    FROM [NAMER].[dbo].[SurgeriesRoomDesc]
                    WHERE [CalendarDisplay] = 1
                      AND [CalendarRoomsArea] = @room";

                    using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
                    {
                        SqlCommand surgeriesCmd = new SqlCommand(surgeriesQuery, conn);
                        surgeriesCmd.Parameters.AddWithValue("@room", room);

                        conn.Open();
                        using (SqlDataReader surgeriesReader = surgeriesCmd.ExecuteReader())
                        {
                            while (surgeriesReader.Read())
                            {
                                SurgeryRooms roomData = new SurgeryRooms
                                {
                                    SurgeryRoom = surgeriesReader["SurgeryRoom"].ToString().Trim(),
                                    // Add more fields as needed
                                };

                                // Fetch number of surgeries for the specific room and date
                                roomData = GetNumberOfSurgeriesRoomCodeDate(roomData, dateToCount);

                                // Add to the list
                                area.SurgeryRooms.Add(roomData);
                            }
                        }
                    }

                    // Add the area to the surgeryRoomsList
                    surgeryRoomsList.Add(area);
                }

                // Add surgeryRoomsList to the daysList
                daysList.Add(surgeryRoomsList);
            }
        }

        return daysList;
    }

    public SurgeryRooms GetNumberOfSurgeriesRoomCodeDate(SurgeryRooms room, string date)
    {
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string query = @"
            SELECT A.[RequestedDepartmentDetails] AS [S_DEPARTMENT_NAME],
                   COUNT(DISTINCT A.Row_ID) AS SurgeryRoom
            FROM [NAMER].[dbo].[SurgeriesCalendar] A
            LEFT JOIN [NAMER].[dbo].[SURGERIES_DEPARTMENT] B
            ON A.RequestedDepartmentDetails = B.[S_DEPARTMENT]
            WHERE A.SurgeryRoomDetails = @room
              AND A.ArrivalDate = @date
              AND A.ArrivalTime IS NOT NULL
              AND A.SurgeryStatus <> 'Canceled'
            GROUP BY A.[RequestedDepartmentDetails]";

            SqlCommand cmd = new SqlCommand(query, myConnection);
            cmd.Parameters.AddWithValue("@room", room.SurgeryRoom);
            cmd.Parameters.AddWithValue("@date", date);

            myConnection.Open();

            int tempNumber = 0;
            room.NumberOfSurgeries = "0";
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    tempNumber += int.Parse(reader["SurgeryRoom"].ToString().Trim());
                    room.S_DEPARTMENT_NAME = reader["S_DEPARTMENT_NAME"].ToString().Trim();
                }
            }

            room.NumberOfSurgeries = tempNumber.ToString();
        }

        return room;
    }
    // get details of all surgeries in the same day
    public SurgeriesRoomDayClass getUrgentSurgeriesByDate(string _fullDate)
    {
        SurgeriesRoomDayClass _SurgeriesRoomDayClass = new SurgeriesRoomDayClass();
        List<SurgeriesCalendarClass> SurgeriesCalendarClassList = new List<SurgeriesCalendarClass>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [Row_ID],[SurgeryRoomDetails],[RequestedDepartmentDetails],FORMAT([ArrivalDate], 'yyyy-MM-dd')as [ArrivalDate],CONVERT(VARCHAR(5),[ArrivalTime], 108) as [ArrivalTime],CONVERT(VARCHAR(5),[EndTime], 108) as [EndTime],SurgeonDoctor,[SurgeryStatus],[SurgeryType],[WithAnesthesia],[Duration],[Urgency],b.S_DEPARTMENT,ser.S_SERVICE_VAL, ser.S_ID, AvgDauration FROM[NAMER].[dbo].[SurgeriesCalendar] a LEFT JOIN[NAMER].[dbo].[SURGERIES_DEPARTMENT] b on[RequestedDepartmentDetails] = b.S_DEPARTMENT_SHORT_DESC LEFT JOIN[NAMER].[dbo].[SurgeriesCalendarPatients] pat on a.Row_ID = pat.SurgeriesCalendarIDFK LEFT JOIN[NAMER].[dbo].[SURGERIES] sur on pat.PM_CASE_NUMBER = sur.S_CASE_NUMBER INNER JOIN[NAMER].[dbo].[SERVICES_NAME] ser on sur.S_SURGERY_CODE = ser.S_ID WHERE ArrivalDate = '" + _fullDate + "' AND[SurgeryType] IN('דחוף','ססיה') AND ArrivalTime IS NOT NULL ORDER BY[ArrivalTime] ASC";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendarClass _SurgeriesCalendarClass = new SurgeriesCalendarClass();
                    SurgeryRequestDepartments _SurgeryRequestDepartments = new SurgeryRequestDepartments();
                    string Row_ID = oReader["Row_ID"].ToString().Trim();
                    string RequestedDepartmentDetails = oReader["RequestedDepartmentDetails"].ToString().Trim();
                    string SurgeryRoomDetails = oReader["SurgeryRoomDetails"].ToString().Trim();
                    string S_SERVICE_VAL = oReader["S_SERVICE_VAL"].ToString().Trim();
                    string S_ID = oReader["S_ID"].ToString().Trim();
                    _SurgeriesCalendarClass.Duration = oReader["Duration"].ToString().Trim();
                    _SurgeriesCalendarClass.AvgDauration = oReader["AvgDauration"].ToString().Trim();
                    _SurgeriesCalendarClass.ArrivalDate = oReader["ArrivalDate"].ToString().Trim() + ' ' + oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.EndDate = oReader["ArrivalDate"].ToString().Trim() + ' ' + oReader["EndTime"].ToString().Trim();
                    _SurgeriesCalendarClass.ArrivalTime = oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.EndTime = oReader["EndTime"].ToString().Trim();
                    _SurgeriesCalendarClass.Urgency = oReader["Urgency"].ToString().Trim();
                    // Get the additional details by row id
                    _SurgeriesCalendarClass.AdditionalDetails = getAdditionalDetailsByRecordRowID(Row_ID);
                    // Get the patient details class
                    _SurgeriesCalendarClass.SurgeryPatientDetails = getSurgeryPatientDetailsByRowID(Row_ID);
                    _SurgeriesCalendarClass.SurgeriesCalendar_Susgeries = new List<SurgeriesCalendar_Susgeries>(){
                    // Add attributes for each surgery object here
                    // For example:
                    new SurgeriesCalendar_Susgeries
                        {
                            Row_ID = "0",
                            Surgery_Name = S_SERVICE_VAL,
                            Surgery_Code = S_ID,
                            Side = "",
                            SurgeriesCalendarIDFK = Row_ID,
                            ServiceNameIDFK = "",
                            Duration = _SurgeriesCalendarClass.Duration,
                            AvgDauration = _SurgeriesCalendarClass.AvgDauration,
                            SurgeryID = "",
                            // Add other relevant attributes
                        },
                    // Add more surgery objects as needed
                    };
                    // Get Surgery by Row ID
                    //_SurgeriesCalendarClass.SurgeriesCalendar_Susgeries = getSurgeriesCalendar_SusgeriesByRowID(SurgeryDetails);
                    // Get the requested department by its code
                    _SurgeriesCalendarClass.SurgeryRequestDepartments = getSurgeryRequestDepartmentsByCode(RequestedDepartmentDetails);
                    // Get the surgeon that operates the surgery
                    _SurgeriesCalendarClass.DoctorSurgeon = oReader["SurgeonDoctor"].ToString().Trim();
                    // Get the surgery room by its code
                    //_SurgeriesCalendarClass.SurgeryRooms = getSurgeryRoomsByCode(SurgeryRoomDetails);
                    // Adding a new surgery object that indicates the setup time.
                    SurgeriesCalendarClass _SurgeriesCalendarClassSetupTime = new SurgeriesCalendarClass();
                    //string setupTime = oReader["ArrivalTime"].ToString().Trim();
                    //DateTime dateTime = DateTime.ParseExact(setupTime, "H:mm", CultureInfo.InvariantCulture);
                    //dateTime = dateTime.AddMinutes(-20);
                    //setupTime = dateTime.ToString("H:mm");
                    _SurgeriesCalendarClassSetupTime.ArrivalDate = oReader["ArrivalDate"].ToString().Trim();// + ' ' + setupTime;
                    _SurgeriesCalendarClassSetupTime.EndDate = oReader["ArrivalDate"].ToString().Trim() + ' ' + oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.ArrivalTime = oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryType = oReader["SurgeryType"].ToString().Trim();
                    _SurgeriesCalendarClass.EndTime = oReader["EndTime"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryStatus = oReader["SurgeryStatus"].ToString().Trim();
                    _SurgeriesCalendarClass.Row_ID = oReader["Row_ID"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryRoom = oReader["SurgeryRoomDetails"].ToString().Trim();
                    _SurgeriesCalendarClass.WithAnesthesia = oReader["WithAnesthesia"].ToString().Trim();
                    _SurgeriesCalendarClass.S_DEPARTMENT = oReader["S_DEPARTMENT"].ToString().Trim();
                    //SurgeriesCalendarClassList.Add(_SurgeriesCalendarClassSetupTime);
                    SurgeriesCalendarClassList.Add(_SurgeriesCalendarClass);
                }
                myConnection.Close();
            }
            _SurgeriesRoomDayClass.SurgeriesCalendarClassList = SurgeriesCalendarClassList;
        }
        return _SurgeriesRoomDayClass;
    }




























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

                    proceduresList.Add(new NappProcedureDto
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
                    });
                }
            }
        }

        return proceduresList;
    }

    public class NappWaitingForVirtualRoomResult
    {
        public List<NappWaitingRowDto> WaitingList { get; set; }

        public NappWaitingForVirtualRoomResult()
        {
            WaitingList = new List<NappWaitingRowDto>();
        }
    }
    //public class NappWaitingRowDto
    //{
    //    public string CaseNumber { get; set; }
    //    public string RequestID { get; set; }
    //    public string RequestDate { get; set; }
    //    public string PatientFirstName { get; set; }
    //    public string PatientLastName { get; set; }
    //    public string PatientId { get; set; }
    //    public string RequestDepart { get; set; }
    //    public string SeodeDepart { get; set; }
    //    public string Department { get; set; }
    //    public string Urgency { get; set; }
    //    public string SurgeryType { get; set; }
    //    public int DurationMinutes { get; set; }
    //    public int? DrorDuration { get; set; }
    //    public int? WaitingDays { get; set; }
    //    public List<NappProcedureDto> Procedures { get; set; }
    //}



    private string ResolveDepartmentDisplayName(string requestDepartCode)
    {
        string code = (requestDepartCode ?? "").Trim();
        if (string.IsNullOrEmpty(code)) return "";

        try
        {
            using (var conn = new SqlConnection(connetionStringNAMER))
            {
                const string sql = @"
SELECT TOP 1 DepartmentHebFullDesc
FROM [NAMER].[dbo].[VW_Department_Heb] WITH (NOLOCK)
WHERE LTRIM(RTRIM(DepartmentHebCode)) = @code";

                var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@code", code);
                conn.Open();
                object val = cmd.ExecuteScalar();
                if (val != null && val != DBNull.Value)
                    return val.ToString().Trim();
            }
        }
        catch (SqlException)
        {
        }
        return code;
    }

    private int? CalcWaitingDays(string requestDateStr, string fullDate)
    {
        if (string.IsNullOrWhiteSpace(requestDateStr) || string.IsNullOrWhiteSpace(fullDate))
            return null;

        string d = requestDateStr.Trim();
        if (d.Length >= 10) d = d.Substring(0, 10);

        // Pre-declare variables for C# 5 compatibility
        DateTime reqDate;
        DateTime boardDate;

        if (DateTime.TryParse(d, out reqDate) && DateTime.TryParse(fullDate, out boardDate))
            return (int)(boardDate.Date - reqDate.Date).TotalDays;

        return null;
    }










    public class NappWaitingRowDto
    {
        public string RowID;
        public string CaseNumber;
        public string RequestID;
        public string RequestDate;
        public string RequestDepart;
        public string SeodeDepart;
        public string Department;
        public string Urgency;
        public string SurgeryType;
        public int DurationMinutes;
        public int DrorDuration;
        public int WaitingDays;

        public string PatientNumber;
        public string Identification;
        public string WaitingFromDate;
        public string AskForMonth;
        public string AskForYear;
        public string DoneDate;
        public string ServiceNumber;
        public string ServiceDescription;
        public string SetDate;
        public string SetNote;

        public List<NappProcedureDto> Procedures;
    }

    public class NappProcedureDto
    {
        public string SurgeryCode;
        public string Surgery_Code;
        public string SurgeryName;
        public string Surgery_Name;
        public string SurgeryCode_2;
        public string SurgeryName_2;
        public string SurgeryCode_3;
        public string SurgeryName_3;
        public string Catalog;
        public string Side;
        public string Priority;
        public string Depart;
        public string SeodeDepart;
        public string BloodUnit;
    }
    public SurgeriesCalendar.NappWaitingForVirtualRoomResult GetNappWaitingForVirtualRoomScheduling(
    string fullDate, string calendarRoomsArea, string roomGroupDesc, string[] roomCodes)
    {
        var result = new SurgeriesCalendar.NappWaitingForVirtualRoomResult();
        fullDate = (fullDate ?? "").Trim();
        if (string.IsNullOrEmpty(fullDate)) return result;

        var rows = new List<NappWaitingRowDto>();

        using (var conn = new SqlConnection(connetionStringNAMER))
        {
            const string sql = @"
;WITH Filtered AS (
    SELECT TOP 60 *,
           TRY_CONVERT(date, AskForDate) AS AskForDateConv
    FROM [NAMER].[dbo].[WaitingList] WITH (NOLOCK)
    WHERE ServiceNumber = 'OP_ANCHOR'
      AND DoneDate IS NULL
    ORDER BY WaitingFromDate DESC
)
SELECT *
FROM Filtered
ORDER BY
  CASE WHEN AskForDateConv IS NULL THEN 1 ELSE 0 END,
  CASE WHEN AskForDateConv = TRY_CONVERT(date, @fullDate) THEN 0 ELSE 1 END,
  ABS(DATEDIFF(day, AskForDateConv, TRY_CONVERT(date, @fullDate)))";

            var cmd = new SqlCommand(sql, conn) { CommandTimeout = 60 };
            cmd.Parameters.Add("@fullDate", SqlDbType.VarChar, 10).Value = fullDate;
            conn.Open();

            using (var r = cmd.ExecuteReader())
            {
                while (r.Read())
                {
                    string waitingFromDate = ReadString(r, "WaitingFromDate");

                    rows.Add(new NappWaitingRowDto
                    {
                        RowID = ReadString(r, "RowID"),
                        CaseNumber = ReadString(r, "RegistrationNumber"),
                        RequestID = ReadString(r, "RowID"),
                        RequestDate = ReadString(r, "AskForDate"),
                        RequestDepart = ReadString(r, "Depart"),
                        SeodeDepart = "",
                        Department = ReadString(r, "Depart"),
                        Urgency = "",
                        SurgeryType = "",
                        DurationMinutes = 60,
                        DrorDuration = 60,
                        WaitingDays = (int)(CalcWaitingDays(waitingFromDate, fullDate) ?? 0),

                        PatientNumber = ReadString(r, "PatientNumber"),
                        Identification = ReadString(r, "Identification"),
                        WaitingFromDate = waitingFromDate,
                        AskForMonth = ReadString(r, "AskForMonth"),
                        AskForYear = ReadString(r, "AskForYear"),
                        DoneDate = ReadString(r, "DoneDate"),
                        ServiceNumber = ReadString(r, "ServiceNumber"),
                        ServiceDescription = ReadString(r, "ServiceDescription"),
                        SetDate = ReadString(r, "SetDate"),
                        SetNote = ReadString(r, "SetNote"),

                        Procedures = new List<NappProcedureDto>
                    {
                        new NappProcedureDto
                        {
                            SurgeryCode = ReadString(r, "SurgeryCode"),
                            Surgery_Code = ReadString(r, "SurgeryCode"),
                            SurgeryName = ReadString(r, "SurgeryName"),
                            Surgery_Name = ReadString(r, "SurgeryName"),
                            SurgeryCode_2 = ReadString(r, "SurgeryCode_2"),
                            SurgeryName_2 = ReadString(r, "SurgeryName_2"),
                            SurgeryCode_3 = ReadString(r, "SurgeryCode_3"),
                            SurgeryName_3 = ReadString(r, "SurgeryName_3"),
                            Catalog = "",
                            Side = "",
                            Priority = "",
                            Depart = ReadString(r, "Depart"),
                            SeodeDepart = "",
                            BloodUnit = ""
                        }
                    }
                    });
                }
            }
        }

        result.WaitingList = rows;
        return result;
    }




































    public SurgeriesRoomDayClass getSurgeriesBySurgeryRoomCode(string _fullDate, string _surRoomCode)
    {
        SurgeriesRoomDayClass _SurgeriesRoomDayClass = new SurgeriesRoomDayClass();
        List<SurgeriesCalendarClass> SurgeriesCalendarClassList = new List<SurgeriesCalendarClass>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {

            //string oString = "SELECT distinct a.[Row_ID],concat(b.RoomGroupDesc,' - ',b.SurgeryRoomDesc)as [SurgeryRoomName],a.SurgeryRoomDetails,[RequestedDepartmentDetails],FORMAT([ArrivalDate], 'yyyy-MM-dd')as [ArrivalDate],CONVERT(VARCHAR(5),[ArrivalTime],108)as [ArrivalTime],CONVERT(VARCHAR(5),[EndTime],108)as [EndTime],case when concat(c.UserFirstName,' ',c.UserLastName) = '' then [SurgeonDoctor] else concat(c.UserFirstName,' ',c.UserLastName) end  [SurgeonDoctor],[SurgeryStatus],[SurgeryType],[WithAnesthesia],[Urgency],[Duration],[NoteType],[NoteTypeRequest],[SurgeryTypeReasonRequest],[SurgeryTypeReason],[SurgeryReasonNoteRequest],[SurgeryReasonNote],a.[BLOOD_BANK], AvgDauration FROM [NAMER].[dbo].[SurgeriesCalendar] a left join [NAMER].[dbo].[SurgeriesRoomDesc] b on a.SurgeryRoomDetails = b.SurgeryRoom left join NAMER_USERS c on a.SurgeonDoctor = c.VMA and StatusDescription = 'לא נעול' and c.VMA <> '' WHERE ArrivalDate = '" + _fullDate + "' AND [SurgeryRoomDetails] IN (SELECT [SurgeryRoom] FROM [NAMER].[dbo].[SurgeriesRoomDesc] WHERE [CalendarRoomsArea] = '" + _surRoomCode + "') AND ArrivalTime IS NOT NULL ORDER BY [ArrivalTime] ASC";


            string oString =
 "SELECT distinct a.[Row_ID],concat(b.RoomGroupDesc,' - ',b.SurgeryRoomDesc) as [SurgeryRoomName],a.SurgeryRoomDetails," +
 "[RequestedDepartmentDetails],FORMAT([ArrivalDate],'yyyy-MM-dd') as [ArrivalDate]," +
 "CONVERT(VARCHAR(5), COALESCE(NULLIF(rt.TimeEntranceToTheOperatingRoom,'00:00:00'), a.[ArrivalTime]),108) as [ArrivalTime]," +
 "CONVERT(VARCHAR(5), CASE " +
 "WHEN rt.TimeExitingTheOperatingRoom IS NOT NULL AND DATEDIFF(SECOND,'00:00:00',rt.TimeExitingTheOperatingRoom) > 0 THEN rt.TimeExitingTheOperatingRoom " +
 "WHEN rt.TimeEndSurgery IS NOT NULL AND DATEDIFF(SECOND,'00:00:00',rt.TimeEndSurgery) > 0 THEN rt.TimeEndSurgery " +
 "WHEN a.AvgDauration IS NOT NULL AND a.AvgDauration <> '00:00' THEN DATEADD(MINUTE, CAST(LEFT(a.AvgDauration,2) AS INT)*60 + CAST(RIGHT(a.AvgDauration,2) AS INT), a.ArrivalTime) " +
 "ELSE a.[EndTime] END,108) as [EndTime]," +
 "case when concat(c.UserFirstName,' ',c.UserLastName) = '' then [SurgeonDoctor] else concat(c.UserFirstName,' ',c.UserLastName) end [SurgeonDoctor]," +
 "a.[SurgeryStatus],a.[SurgeryType],a.[WithAnesthesia],a.[Urgency],a.[Duration]," +
 "[NoteType],[NoteTypeRequest],[SurgeryTypeReasonRequest],[SurgeryTypeReason]," +
 "[SurgeryReasonNoteRequest],[SurgeryReasonNote],a.[BLOOD_BANK],AvgDauration " +
 "FROM [NAMER].[dbo].[SurgeriesCalendar] a WITH (NOLOCK) " +
 "LEFT JOIN [NAMER].[dbo].[SurgeriesRoomDesc] b WITH (NOLOCK) ON a.SurgeryRoomDetails = b.SurgeryRoom " +
 "LEFT JOIN NAMER_USERS c WITH (NOLOCK) ON a.SurgeonDoctor = c.VMA AND StatusDescription = 'לא נעול' AND c.VMA <> '' " +
 "LEFT JOIN [NAMER].[dbo].[SurgeriesRealTime] rt WITH (NOLOCK) ON a.SurgeryID = rt.SurgeryID " +
 "WHERE ArrivalDate = '" + _fullDate + "' " +
 "AND [SurgeryRoomDetails] IN (SELECT [SurgeryRoom] FROM [NAMER].[dbo].[SurgeriesRoomDesc] WITH (NOLOCK) WHERE [CalendarRoomsArea] = '" + _surRoomCode + "') " +
 "AND ArrivalTime IS NOT NULL " +
 "ORDER BY [ArrivalTime] ASC";

            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendarClass _SurgeriesCalendarClass = new SurgeriesCalendarClass();
                    SurgeryRequestDepartments _SurgeryRequestDepartments = new SurgeryRequestDepartments();
                    string Row_ID = oReader["Row_ID"].ToString().Trim();
                    string RequestedDepartmentDetails = oReader["RequestedDepartmentDetails"].ToString().Trim();
                    string SurgeryRoomDetails = oReader["SurgeryRoomDetails"].ToString().Trim();
                    _SurgeriesCalendarClass.ArrivalDate = oReader["ArrivalDate"].ToString().Trim() + ' ' + oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.EndDate = oReader["ArrivalDate"].ToString().Trim() + ' ' + oReader["EndTime"].ToString().Trim();
                    _SurgeriesCalendarClass.ArrivalTime = oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.EndTime = oReader["EndTime"].ToString().Trim();
                    _SurgeriesCalendarClass.Urgency = oReader["Urgency"].ToString().Trim();
                    _SurgeriesCalendarClass.Duration = oReader["Duration"].ToString().Trim();
                    _SurgeriesCalendarClass.AvgDauration = oReader["AvgDauration"].ToString().Trim();
                    _SurgeriesCalendarClass.BLOOD_BANK = oReader["BLOOD_BANK"].ToString().Trim();
                    _SurgeriesCalendarClass.NoteType = oReader["NoteType"].ToString().Trim();
                    _SurgeriesCalendarClass.NoteTypeRequest = oReader["NoteTypeRequest"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryReasonNote = oReader["SurgeryReasonNote"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryReasonNoteRequest = oReader["SurgeryReasonNoteRequest"].ToString().Trim();
                    string SurgeryTypeReasonRequest = oReader["SurgeryTypeReasonRequest"].ToString().Trim();
                    string SurgeryTypeReason = oReader["SurgeryTypeReason"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryTypeReasonRequest = getSurgeryNoteByRowID(SurgeryTypeReasonRequest);
                    _SurgeriesCalendarClass.SurgeryTypeReason = getSurgeryNoteByRowID(SurgeryTypeReason);
                    // Get the additional details by row id
                    _SurgeriesCalendarClass.AdditionalDetails = getAdditionalDetailsByRecordRowID(Row_ID);
                    // Get the patient details class
                    _SurgeriesCalendarClass.SurgeryPatientDetails = getSurgeryPatientDetailsByRowID(Row_ID);
                    // Get the requested department by its code
                    _SurgeriesCalendarClass.SurgeryRequestDepartments = getSurgeryRequestDepartmentsByCode(RequestedDepartmentDetails);
                    // Get the surgeon that operates the surgery
                    _SurgeriesCalendarClass.DoctorSurgeon = oReader["SurgeonDoctor"].ToString().Trim();
                    // Get the service by its calendar id
                    _SurgeriesCalendarClass.SurgeriesCalendar_Service = getPatientServicesListByCalendarNumber(Row_ID);
                    // Get the surgery by its calendar id
                    _SurgeriesCalendarClass.SurgeriesCalendar_Susgeries = getPatientSurgeriesListByCalendarNumber(Row_ID);
                    // Get the tools by its calendar id
                    _SurgeriesCalendarClass.SurgeriesCalendar_Tools = getPatientToolsListByCalendarNumber(Row_ID);
                    // Adding a new surgery object that indicates the setup time.
                    SurgeriesCalendarClass _SurgeriesCalendarClassSetupTime = new SurgeriesCalendarClass();
                    _SurgeriesCalendarClassSetupTime.ArrivalDate = oReader["ArrivalDate"].ToString().Trim();
                    _SurgeriesCalendarClassSetupTime.EndDate = oReader["ArrivalDate"].ToString().Trim() + ' ' + oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.ArrivalTime = oReader["ArrivalTime"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryType = oReader["SurgeryType"].ToString().Trim();
                    _SurgeriesCalendarClass.EndTime = oReader["EndTime"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryStatus = oReader["SurgeryStatus"].ToString().Trim();
                    _SurgeriesCalendarClass.Row_ID = oReader["Row_ID"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryRoom = oReader["SurgeryRoomDetails"].ToString().Trim();
                    _SurgeriesCalendarClass.SurgeryRoomName = oReader["SurgeryRoomName"].ToString().Trim();
                    _SurgeriesCalendarClass.WithAnesthesia = oReader["WithAnesthesia"].ToString().Trim();
                    SurgeriesCalendarClassList.Add(_SurgeriesCalendarClass);
                }
                myConnection.Close();
            }
            _SurgeriesRoomDayClass.SurgeriesCalendarClassList = SurgeriesCalendarClassList;
        }
        return _SurgeriesRoomDayClass;
    }
    private List<SurgeriesCalendar_Service> getPatientServicesListByCalendarNumber(string _Row_ID)
    {
        List<SurgeriesCalendar_Service> PatientServicesList = new List<SurgeriesCalendar_Service>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [Service_Name],[Service_Code],[SurgeriesCalendarIDFK],[ServiceNameIDFK] FROM [NAMER].[dbo].[SurgeriesCalendar_Service] WHERE [SurgeriesCalendarIDFK] = " + _Row_ID + " group by [Service_Name],[Service_Code],[SurgeriesCalendarIDFK],[ServiceNameIDFK]";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendar_Service _SurgeryPatinetServices = new SurgeriesCalendar_Service();
                    _SurgeryPatinetServices.Service_Name = oReader["Service_Name"].ToString().Trim();
                    _SurgeryPatinetServices.Service_Code = oReader["Service_Code"].ToString().Trim();
                    _SurgeryPatinetServices.SurgeriesCalendarIDFK = oReader["SurgeriesCalendarIDFK"].ToString().Trim();
                    _SurgeryPatinetServices.ServiceNameIDFK = oReader["ServiceNameIDFK"].ToString().Trim();
                    PatientServicesList.Add(_SurgeryPatinetServices);
                }
                myConnection.Close();
            }
        }
        return PatientServicesList;
    }
    private List<SurgeriesCalendar_Susgeries> getPatientSurgeriesListByCalendarNumber(string _Row_ID)
    {
        List<SurgeriesCalendar_Susgeries> PatientSurgeriesList = new List<SurgeriesCalendar_Susgeries>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [Surgery_Name],[Surgery_Code],[Side],[SurgeriesCalendarIDFK],[SurgeryID],max(cast([DrorDuration]as int))[DrorDuration],[Depart] FROM [NAMER].[dbo].[SurgeriesCalendar_Surgeries] WHERE [SurgeriesCalendarIDFK] = " + _Row_ID + " AND [Canceled] = 0 group by [Surgery_Name],[Surgery_Code],[Side],[SurgeriesCalendarIDFK],[SurgeryID],[Depart]";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendar_Susgeries _SurgeryPatinetSurgeries = new SurgeriesCalendar_Susgeries();
                    _SurgeryPatinetSurgeries.Surgery_Name = oReader["Surgery_Name"].ToString().Trim();
                    _SurgeryPatinetSurgeries.Surgery_Code = oReader["Surgery_Code"].ToString().Trim();
                    _SurgeryPatinetSurgeries.SurgeriesCalendarIDFK = oReader["SurgeriesCalendarIDFK"].ToString().Trim();
                    _SurgeryPatinetSurgeries.Side = oReader["Side"].ToString().Trim();
                    _SurgeryPatinetSurgeries.DrorDuration = oReader["DrorDuration"].ToString().Trim();
                    _SurgeryPatinetSurgeries.SurgeryID = oReader["SurgeryID"].ToString().Trim();
                    _SurgeryPatinetSurgeries.Depart = oReader["Depart"].ToString().Trim();
                    PatientSurgeriesList.Add(_SurgeryPatinetSurgeries);
                }
                myConnection.Close();
            }
        }
        return PatientSurgeriesList;
    }
    private List<SurgeriesCalendar_Tools> getPatientToolsListByCalendarNumber(string _Row_ID)
    {
        List<SurgeriesCalendar_Tools> PatientSurgeriesList = new List<SurgeriesCalendar_Tools>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [Row_ID],[Tool_Name],[Tool_Code],[Tool_Need],[SurgeriesCalendarIDFK] FROM [NAMER].[dbo].[SurgeriesCalendarTools] WHERE Canceled <> 'X' AND  [SurgeriesCalendarIDFK] = " + _Row_ID;
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendar_Tools _SurgeryPatinetTools = new SurgeriesCalendar_Tools();
                    _SurgeryPatinetTools.Row_ID = oReader["Row_ID"].ToString().Trim();
                    _SurgeryPatinetTools.Tool_Name = oReader["Tool_Name"].ToString().Trim();
                    _SurgeryPatinetTools.Tool_Code = oReader["Tool_Code"].ToString().Trim();
                    _SurgeryPatinetTools.Tool_Need = oReader["Tool_Need"].ToString().Trim();
                    PatientSurgeriesList.Add(_SurgeryPatinetTools);
                }
                myConnection.Close();
            }
        }
        return PatientSurgeriesList;
    }
    private SurgeryRooms getSurgeryRoomsByCode(string _SurgeryRoomDetails)
    {
        SurgeryRooms _SurgeryRooms = new SurgeryRooms();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [SurgeryRoom],[SurgeryRoomDesc],[DisplayOrder],[RoomGroupDesc],[GroupOrder],[ShortRoomGroupDesc],[CalendarDisplay] FROM [NAMER].[dbo].[SurgeriesRoomDesc] WHERE [SurgeryRoom] = '" + _SurgeryRoomDetails + "'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    _SurgeryRooms.SurgeryRoom = oReader["SurgeryRoom"].ToString().Trim();
                    _SurgeryRooms.SurgeryRoomDesc = oReader["SurgeryRoomDesc"].ToString().Trim();
                    _SurgeryRooms.DisplayOrder = oReader["DisplayOrder"].ToString().Trim();
                    _SurgeryRooms.RoomGroupDesc = oReader["RoomGroupDesc"].ToString().Trim();
                    _SurgeryRooms.GroupOrder = oReader["GroupOrder"].ToString().Trim();
                    _SurgeryRooms.ShortRoomGroupDesc = oReader["ShortRoomGroupDesc"].ToString().Trim();
                    _SurgeryRooms.CalendarDisplay = oReader["CalendarDisplay"].ToString().Trim();
                }
                myConnection.Close();
            }
        }
        return _SurgeryRooms;
    }
    private AdditionalDetails getAdditionalDetailsByRecordRowID(string _Row_ID)
    {
        AdditionalDetails _SurgeryAdditionalDetails = new AdditionalDetails();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [LAP_OR_OPEN],[SIDE],[LEYING_POSITION],[ISOLATION],[BLOOD_BANK],[NOTE],[TOOLS],[ANESTHESIA],[DIMOT],[HOSPITALIZATION] FROM [NAMER].[dbo].[SurgeriesCalendar] WHERE [Row_ID] = '" + _Row_ID + "'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    _SurgeryAdditionalDetails.LAP_OR_OPEN = oReader["LAP_OR_OPEN"].ToString().Trim();
                    _SurgeryAdditionalDetails.SIDE = oReader["SIDE"].ToString().Trim();
                    _SurgeryAdditionalDetails.LEYING_POSITION = oReader["LEYING_POSITION"].ToString().Trim();
                    _SurgeryAdditionalDetails.ISOLATION = oReader["ISOLATION"].ToString().Trim();
                    _SurgeryAdditionalDetails.BLOOD_BANK = oReader["BLOOD_BANK"].ToString().Trim();
                    _SurgeryAdditionalDetails.NOTE = oReader["NOTE"].ToString().Trim();
                    _SurgeryAdditionalDetails.TOOLS = oReader["TOOLS"].ToString().Trim();
                    _SurgeryAdditionalDetails.ANESTHESIA = oReader["ANESTHESIA"].ToString().Trim();
                    _SurgeryAdditionalDetails.DIMOT = oReader["DIMOT"].ToString().Trim();
                    _SurgeryAdditionalDetails.HOSPITALIZATION = oReader["HOSPITALIZATION"].ToString().Trim();
                }
                myConnection.Close();
            }
        }
        return _SurgeryAdditionalDetails;
    }
    private SurgeryRequestDepartments getSurgeryRequestDepartmentsByCode(string _RequestedDepartmentDetails)
    {
        SurgeryRequestDepartments _SurgeryRequestDepartments = new SurgeryRequestDepartments();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            //string oString = "SELECT [SD_ROW_ID],[S_DEPARTMENT],[S_DEPARTMENT_NAME],[SD_Priority],[S_DEPARTMENT_SHORT_DESC] FROM [NAMER].[dbo].[SURGERIES_DEPARTMENT] WHERE [S_DEPARTMENT] = '" + _RequestedDepartmentDetails + "'";
            string oString = "SELECT DISTINCT [S_DEPARTMENT] FROM [NAMER].[dbo].[SURGERIES_DEPARTMENT] WHERE [S_DEPARTMENT] = '" + _RequestedDepartmentDetails + "'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    //_SurgeryRequestDepartments.SD_ROW_ID = oReader["SD_ROW_ID"].ToString().Trim();
                    _SurgeryRequestDepartments.S_DEPARTMENT = oReader["S_DEPARTMENT"].ToString().Trim();
                    //_SurgeryRequestDepartments.S_DEPARTMENT_NAME = oReader["S_DEPARTMENT_NAME"].ToString().Trim();
                    //_SurgeryRequestDepartments.SD_Priority = oReader["SD_Priority"].ToString().Trim();
                    //_SurgeryRequestDepartments.S_DEPARTMENT_SHORT_DESC = oReader["S_DEPARTMENT_SHORT_DESC"].ToString().Trim();
                }
                myConnection.Close();
            }
        }
        _SurgeryRequestDepartments.S_DEPARTMENT = _RequestedDepartmentDetails;
        return _SurgeryRequestDepartments;
    }
    /*private SurgeriesCalendar_Susgeries getSurgeriesCalendar_SusgeriesByRowID(string _S_ROW_ID)
    {
        SurgeriesCalendar_Susgeries _SurgeriesCalendar_Susgeries = new SurgeriesCalendar_Susgeries();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [S_ROW_ID],[S_PRIMARY_KEY],[S_ID],[S_CATALOG],[S_END_DATE],[S_START_DATE],[S_SERVICE_VAL] FROM [NAMER].[dbo].[SERVICES_NAME] WHERE [S_CATALOG] = 'IC' AND [S_ROW_ID] = '"+_S_ROW_ID+"'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    _SurgeriesCalendar_Susgeries.S_ROW_ID = oReader["S_ROW_ID"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_PRIMARY_KEY = oReader["S_PRIMARY_KEY"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_ID = oReader["S_ID"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_CATALOG = oReader["S_CATALOG"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_END_DATE = oReader["S_END_DATE"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_START_DATE = oReader["S_START_DATE"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_SERVICE_VAL = oReader["S_SERVICE_VAL"].ToString().Trim();
                }
                myConnection.Close();
            }
        }
        return _SurgeriesCalendar_Susgeries;
    }*/
    public List<SurgeriesCalendar_Susgeries> getAllSurgeriesCalendar_SusgeriesByRequestingDepartment(string _requestingDepartmentCode)
    {
        List<SurgeriesCalendar_Susgeries> _SurgeriesCalendar_SusgeriessList = new List<SurgeriesCalendar_Susgeries>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT C.S_ROW_ID, C.S_PRIMARY_KEY, C.S_ID, C.S_CATALOG, C.S_END_DATE, C.S_START_DATE, C.S_SERVICE_VAL, A.ProcedureAvg,CASE WHEN A.ProcedureAvg >= 60 THEN (SELECT CAST((A.ProcedureAvg / 60) AS VARCHAR(2)) + '.' + CASE WHEN(A.ProcedureAvg % 60) > 0 THEN CAST((A.ProcedureAvg % 60) AS VARCHAR(2)) + '' ELSE '' END) ELSE CAST((A.ProcedureAvg % 60) AS VARCHAR(2)) + '' END AS ProcedureAvgHours FROM [NAMER].[dbo].[SURGERIES] B LEFT JOIN VW_SurgeryProcedureAvg A ON B.S_SURGERY_CODE = A.S_SURGERY_CODE INNER JOIN [NAMER].[dbo].[SERVICES_NAME] C ON B.S_SURGERY_CODE = C.S_ID WHERE B.S_DEPARTMENT_REQUEST  IN (SELECT [S_DEPARTMENT_SHORT_DESC] FROM [NAMER].[dbo].[SURGERIES_DEPARTMENT] WHERE [S_DEPARTMENT] = '" + _requestingDepartmentCode + "') GROUP BY C.S_ROW_ID, C.S_PRIMARY_KEY, C.S_ID, C.S_CATALOG, C.S_END_DATE, C.S_START_DATE, C.S_SERVICE_VAL, A.ProcedureAvg ORDER BY C.S_SERVICE_VAL ASC";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendar_Susgeries _SurgeriesCalendar_Susgeries = new SurgeriesCalendar_Susgeries();
                    _SurgeriesCalendar_Susgeries.Row_ID = oReader["Row_ID"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.Surgery_Name = oReader["Surgery_Name"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.Surgery_Code = oReader["Surgery_Code"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.Side = oReader["Side"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.SurgeriesCalendarIDFK = oReader["SurgeriesCalendarIDFK"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.ServiceNameIDFK = oReader["ServiceNameIDFK"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.Duration = oReader["ProcedureAvgHours"].ToString().Trim();
                    if (_SurgeriesCalendar_Susgeries.Duration == "")
                        _SurgeriesCalendar_Susgeries.Duration = "0.15";
                    _SurgeriesCalendar_SusgeriessList.Add(_SurgeriesCalendar_Susgeries);
                }
                myConnection.Close();
            }
        }
        return _SurgeriesCalendar_SusgeriessList;
    }
    /*public List<SurgeriesCalendar_Susgeries> getAllServicesServicesNameByRequestingDepartment()
    {
        List<SurgeriesCalendar_Susgeries> _SurgeriesCalendar_SusgeriessList = new List<SurgeriesCalendar_Susgeries>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT TOP 100 C.S_ROW_ID, C.S_PRIMARY_KEY, C.S_ID, C.S_CATALOG, C.S_END_DATE, C.S_START_DATE, C.S_SERVICE_VAL, A.ProcedureAvg,CASE WHEN A.ProcedureAvg >= 60 THEN (SELECT CAST((A.ProcedureAvg / 60) AS VARCHAR(2)) + '.' + CASE WHEN(A.ProcedureAvg % 60) > 0 THEN CAST((A.ProcedureAvg % 60) AS VARCHAR(2)) + '' ELSE '' END) ELSE CAST((A.ProcedureAvg % 60) AS VARCHAR(2)) + '' END AS ProcedureAvgHours FROM [NAMER].[dbo].[SURGERIES] B LEFT JOIN VW_SurgeryProcedureAvg A ON B.S_SURGERY_CODE = A.S_SURGERY_CODE INNER JOIN [NAMER].[dbo].[SERVICES_NAME] C ON B.S_SURGERY_CODE = C.S_ID WHERE B.S_DEPARTMENT_REQUEST  IN (SELECT [S_DEPARTMENT_SHORT_DESC] FROM [NAMER].[dbo].[SURGERIES_DEPARTMENT] GROUP BY C.S_ROW_ID, C.S_PRIMARY_KEY, C.S_ID, C.S_CATALOG, C.S_END_DATE, C.S_START_DATE, C.S_SERVICE_VAL, A.ProcedureAvg ORDER BY C.S_SERVICE_VAL ASC";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendar_Susgeries _SurgeriesCalendar_Susgeries = new SurgeriesCalendar_Susgeries();
                    _SurgeriesCalendar_Susgeries.S_ROW_ID = oReader["S_ROW_ID"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_PRIMARY_KEY = oReader["S_PRIMARY_KEY"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_ID = oReader["S_ID"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_CATALOG = oReader["S_CATALOG"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_END_DATE = oReader["S_END_DATE"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_START_DATE = oReader["S_START_DATE"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_SERVICE_VAL = oReader["S_SERVICE_VAL"].ToString().Trim();
                    _SurgeriesCalendar_Susgeries.S_SERVICE_DURATION = oReader["ProcedureAvgHours"].ToString().Trim();
                    if (_SurgeriesCalendar_Susgeries.S_SERVICE_DURATION == "")
                        _SurgeriesCalendar_Susgeries.S_SERVICE_DURATION = "0.15";
                    _SurgeriesCalendar_SusgeriessList.Add(_SurgeriesCalendar_Susgeries);
                }
                myConnection.Close();
            }
        }
        return _SurgeriesCalendar_SusgeriessList;
    }*/
    private SurgeryPatientDetails getSurgeryPatientDetailsByRowID(string _rowID)
    {
        SurgeryPatientDetails _PatientDetails = new SurgeryPatientDetails();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [PM_ROW_ID],[PM_CASE_NUMBER],[SurgeriesCalendarIDFK],[PM_PATIENT_GENDER],[PM_LAST_NAME],[PM_FIRST_NAME],[PM_DOB],[PM_PATIENT_ID] FROM [NAMER].[dbo].[SurgeriesCalendarPatients] WHERE [SurgeriesCalendarIDFK] = '" + _rowID + "'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    _PatientDetails.PM_ROW_ID = oReader["PM_ROW_ID"].ToString().Trim();
                    _PatientDetails.PM_CASE_NUMBER = oReader["PM_CASE_NUMBER"].ToString().Trim();
                    _PatientDetails.SurgeriesCalendarIDFK = oReader["SurgeriesCalendarIDFK"].ToString().Trim();
                    _PatientDetails.PM_PATIENT_GENDER = oReader["PM_PATIENT_GENDER"].ToString().Trim();
                    _PatientDetails.PM_LAST_NAME = oReader["PM_LAST_NAME"].ToString().Trim();
                    _PatientDetails.PM_FIRST_NAME = oReader["PM_FIRST_NAME"].ToString().Trim();
                    _PatientDetails.PM_DOB = oReader["PM_DOB"].ToString().Trim();
                    _PatientDetails.PM_PATIENT_ID = oReader["PM_PATIENT_ID"].ToString().Trim();
                }
                myConnection.Close();
            }
        }
        return _PatientDetails;
    }
    private List<string> getSurgeonStaff()
    {
        List<string> _surgeonsList = new List<string>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT DISTINCT [S_NAME] FROM [NAMER].[dbo].[SURGERIES_STAFF] WHERE [S_ROLE] = 'מנתח ראשי'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    _surgeonsList.Add(oReader["S_NAME"].ToString().Trim());
                }
                myConnection.Close();
            }
        }
        return _surgeonsList;
    }
    public SurgeriesCalendarUsersTypes getSurgeriesCalendarUserNamePermissions(string _userName)
    {
        SurgeriesCalendarUsersTypes _user = new SurgeriesCalendarUsersTypes();
        _user.UserDepartment = new List<string>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [Row_ID],[UserName],[UserType],[UserDepartment] FROM [NAMER].[dbo].[SurgeriesCalendarUsersTypes] WHERE [UserName] = '" + _userName + "'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    _user.Row_ID = oReader["Row_ID"].ToString().Trim();
                    _user.UserName = oReader["UserName"].ToString().Trim();
                    _user.UserType = oReader["UserType"].ToString().Trim();
                    _user.UserDepartment.Add(oReader["UserDepartment"].ToString().Trim());
                }
                myConnection.Close();
            }
        }
        return _user;
    }
    public List<SurgeriesCalendar_Employees> getEmployeesListForSurgeriesCalendar()
    {
        List<SurgeriesCalendar_Employees> employees = new List<SurgeriesCalendar_Employees>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesCalendar_Employees emp = new SurgeriesCalendar_Employees();
                    emp.FirstName = oReader["FirstName"].ToString().Trim();
                    emp.LastName = oReader["LastName"].ToString().Trim();
                    emp.id = oReader["id"].ToString().Trim();
                    emp.Email = oReader["Email"].ToString().Trim();
                    employees.Add(emp);
                }
                myConnection.Close();
            }
        }
        return employees;
    }
    private SurgeriesFixedNotes getSurgeryNoteByRowID(string SurgeryNote)
    {
        SurgeriesFixedNotes _note = new SurgeriesFixedNotes();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [Row_ID],[Description],[Priority],[Status],[Type],[Section] FROM [NAMER].[dbo].[SurgeriesFixedNotes] WHERE [Row_ID] = '" + SurgeryNote + "'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    _note.Row_ID = oReader["Row_ID"].ToString().Trim();
                    _note.Description = oReader["Description"].ToString().Trim();
                    _note.Priority = oReader["Priority"].ToString().Trim();
                    _note.Type = oReader["Type"].ToString().Trim();
                    _note.Status = oReader["Status"].ToString().Trim();
                    _note.Section = oReader["Section"].ToString().Trim();
                }
                myConnection.Close();
            }
        }
        return _note;
    }
    private List<SurgeriesFixedNotes> getSurgeriesFixedNotes()
    {
        List<SurgeriesFixedNotes> _notesList = new List<SurgeriesFixedNotes>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT [Row_ID],[Description],[Priority],[Status],[Type],[Section] FROM [NAMER].[dbo].[SurgeriesFixedNotes]";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesFixedNotes _note = new SurgeriesFixedNotes();
                    _note.Row_ID = oReader["Row_ID"].ToString().Trim();
                    _note.Description = oReader["Description"].ToString().Trim();
                    _note.Priority = oReader["Priority"].ToString().Trim();
                    _note.Status = oReader["Status"].ToString().Trim();
                    _note.Type = oReader["Type"].ToString().Trim();
                    _note.Section = oReader["Section"].ToString().Trim();
                    _notesList.Add(_note);
                }
                myConnection.Close();
            }
        }
        return _notesList;
    }
    public List<SurgeryRequestDepartments> getRequestedDepartments()
    {
        List<SurgeryRequestDepartments> departmentList = new List<SurgeryRequestDepartments>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string oString = "SELECT DISTINCT [S_DEPARTMENT] FROM [NAMER].[dbo].[SURGERIES_DEPARTMENT] ORDER BY [S_DEPARTMENT] ASC";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeryRequestDepartments department = new SurgeryRequestDepartments();
                    //department.SD_ROW_ID = oReader["SD_ROW_ID"].ToString().Trim();
                    department.S_DEPARTMENT = oReader["S_DEPARTMENT"].ToString().Trim();
                    //department.S_DEPARTMENT_NAME = oReader["S_DEPARTMENT_NAME"].ToString().Trim();
                    //department.S_DEPARTMENT_SHORT_DESC = oReader["S_DEPARTMENT_SHORT_DESC"].ToString().Trim();
                    //department.SD_Priority = oReader["SD_Priority"].ToString().Trim();
                    departmentList.Add(department);
                }
                myConnection.Close();
            }
        }
        return departmentList;
    }
    public AllSurgeryDetailsAndDepartments getSurgeriesServicesNames()
    {
        AllSurgeryDetailsAndDepartments surgeryDetailsListOfContent = new AllSurgeryDetailsAndDepartments();
        //surgeryDetailsListOfContent.surgeriesList = getAllSurgeriesCalendar_Susgeries();
        surgeryDetailsListOfContent.surgeryRequestDepartments = getRequestedDepartments();
        surgeryDetailsListOfContent.surgeonsList = getSurgeonStaff();
        surgeryDetailsListOfContent.surgeriesFixedNotes = getSurgeriesFixedNotes();

        return surgeryDetailsListOfContent;
    }
    public string submitNewOrUpdateCalendarSurgeryRecord(SurgeriesCalendarClass surgeryFormData)
    {
        if (surgeryFormData.Row_ID == null)
        {
            return newSurgeryRecord(surgeryFormData);
        }
        else
        {
            return updateSurgeryRecord(surgeryFormData);
        }
    }
    private string newSurgeryRecord(SurgeriesCalendarClass surgeryFormData)
    {
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            string newSurgerySQLString = "INSERT INTO [dbo].[SurgeriesCalendar]([SurgeryRoomDetails],[RequestedDepartmentDetails],[ArrivalDate],[ArrivalTime],[EndTime],[LAP_OR_OPEN],[SIDE],[LEYING_POSITION],[ISOLATION],[BLOOD_BANK],[NOTE],[TOOLS],[ANESTHESIA],[DIMOT],[HOSPITALIZATION],[LastUpdateDateTime],[LastUpdateUserName]) VALUES (@SurgeryRoomDetails,@RequestedDepartmentDetails,@ArrivalDate,@ArrivalTime,@EndTime,@SurgeonDoctor,@LAP_OR_OPEN,@SIDE,@LEYING_POSITION,@ISOLATION,@BLOOD_BANK,@NOTE,@TOOLS,@ANESTHESIA,@DIMOT,@HOSPITALIZATION,@LastUpdateDateTime,@LastUpdateUserName)";
            cnn1.Open();
            SqlCommand postAddCmd = new SqlCommand(newSurgerySQLString);
            if (checkIfSurgeryRoomOccupied(surgeryFormData))
            {
                return "Exists";
            }
            postAddCmd.Parameters.AddWithValue("@SurgeryRoomDetails", surgeryFormData.SurgeryRoom);
            postAddCmd.Parameters.AddWithValue("@RequestedDepartmentDetails", surgeryFormData.SurgeryRequestDepartments.S_DEPARTMENT);
            postAddCmd.Parameters.AddWithValue("@ArrivalDate", surgeryFormData.ArrivalDate);
            postAddCmd.Parameters.AddWithValue("@ArrivalTime", surgeryFormData.ArrivalTime);
            postAddCmd.Parameters.AddWithValue("@EndTime", surgeryFormData.EndTime);
            postAddCmd.Parameters.AddWithValue("@LAP_OR_OPEN", ((object)surgeryFormData.AdditionalDetails.LAP_OR_OPEN) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@SIDE", ((object)surgeryFormData.AdditionalDetails.SIDE) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@LEYING_POSITION", ((object)surgeryFormData.AdditionalDetails.LEYING_POSITION) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@ISOLATION", ((object)surgeryFormData.AdditionalDetails.ISOLATION) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@BLOOD_BANK", ((object)surgeryFormData.AdditionalDetails.BLOOD_BANK) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@NOTE", ((object)surgeryFormData.AdditionalDetails.NOTE) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@TOOLS", ((object)surgeryFormData.AdditionalDetails.TOOLS) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@ANESTHESIA", surgeryFormData.AdditionalDetails.ANESTHESIA);
            postAddCmd.Parameters.AddWithValue("@DIMOT", surgeryFormData.AdditionalDetails.DIMOT);
            postAddCmd.Parameters.AddWithValue("@HOSPITALIZATION", surgeryFormData.AdditionalDetails.HOSPITALIZATION);
            postAddCmd.Parameters.AddWithValue("@LastUpdateDateTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff", CultureInfo.InvariantCulture));
            postAddCmd.Parameters.AddWithValue("@LastUpdateUserName", surgeryFormData.LastUpdateUserName);
            postAddCmd.CommandType = System.Data.CommandType.Text;
            postAddCmd.Connection = cnn1;
            postAddCmd.ExecuteNonQuery();
            return "Saved";
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return "Error";
        }
    }
    private string updateSurgeryRecord(SurgeriesCalendarClass surgeryFormData)
    {
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            string newSurgerySQLString = "UPDATE [dbo].[SurgeriesCalendar] SET [LAP_OR_OPEN] = @LAP_OR_OPEN,[SIDE] = @SIDE,[LEYING_POSITION] = @LEYING_POSITION,[ISOLATION] = @ISOLATION,[BLOOD_BANK] = @BLOOD_BANK,[NOTE] = @NOTE,[TOOLS] = @TOOLS,[ANESTHESIA] = @ANESTHESIA,[DIMOT] = @DIMOT,[HOSPITALIZATION] = @HOSPITALIZATION,[LastUpdateDateTime] = @LastUpdateDateTime,[LastUpdateUserName] = @LastUpdateUserName, [Urgency]=@Urgency, [NoteType] = @NoteType, [NoteTypeRequest] = @NoteTypeRequest, [SurgeryReasonNote] = @SurgeryReasonNote, [SurgeryReasonNoteRequest] = @SurgeryReasonNoteRequest, [SurgeryTypeReason] = @SurgeryTypeReason, [SurgeryTypeReasonRequest] = @SurgeryTypeReasonRequest WHERE [Row_ID] = @Row_ID";
            cnn1.Open();
            SqlCommand postAddCmd = new SqlCommand(newSurgerySQLString);
            postAddCmd.Parameters.AddWithValue("@Row_ID", surgeryFormData.Row_ID);
            postAddCmd.Parameters.AddWithValue("@LAP_OR_OPEN", ((object)surgeryFormData.AdditionalDetails.LAP_OR_OPEN) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@SIDE", ((object)surgeryFormData.AdditionalDetails.SIDE) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@LEYING_POSITION", ((object)surgeryFormData.AdditionalDetails.LEYING_POSITION) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@ISOLATION", ((object)surgeryFormData.AdditionalDetails.ISOLATION) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@BLOOD_BANK", ((object)surgeryFormData.AdditionalDetails.BLOOD_BANK) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@NOTE", ((object)surgeryFormData.AdditionalDetails.NOTE) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@TOOLS", ((object)surgeryFormData.AdditionalDetails.TOOLS) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@NoteType", ((object)surgeryFormData.NoteType) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@NoteTypeRequest", ((object)surgeryFormData.NoteTypeRequest) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@SurgeryReasonNote", ((object)surgeryFormData.SurgeryReasonNote) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@SurgeryReasonNoteRequest", ((object)surgeryFormData.SurgeryReasonNoteRequest) ?? DBNull.Value);
            if (surgeryFormData.SurgeryTypeReason == null)
                postAddCmd.Parameters.AddWithValue("@SurgeryTypeReason", ((object)surgeryFormData.SurgeryTypeReason) ?? DBNull.Value);
            else
                postAddCmd.Parameters.AddWithValue("@SurgeryTypeReason", ((object)surgeryFormData.SurgeryTypeReason.Row_ID) ?? DBNull.Value);
            if (surgeryFormData.SurgeryTypeReasonRequest == null)
                postAddCmd.Parameters.AddWithValue("@SurgeryTypeReasonRequest", ((object)surgeryFormData.SurgeryTypeReasonRequest) ?? DBNull.Value);
            else
                postAddCmd.Parameters.AddWithValue("@SurgeryTypeReasonRequest", ((object)surgeryFormData.SurgeryTypeReasonRequest.Row_ID) ?? DBNull.Value);
            postAddCmd.Parameters.AddWithValue("@ANESTHESIA", surgeryFormData.AdditionalDetails.ANESTHESIA);
            postAddCmd.Parameters.AddWithValue("@DIMOT", surgeryFormData.AdditionalDetails.DIMOT);
            postAddCmd.Parameters.AddWithValue("@HOSPITALIZATION", surgeryFormData.AdditionalDetails.HOSPITALIZATION);
            postAddCmd.Parameters.AddWithValue("@Urgency", surgeryFormData.Urgency);
            postAddCmd.Parameters.AddWithValue("@LastUpdateDateTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff", CultureInfo.InvariantCulture));
            postAddCmd.Parameters.AddWithValue("@LastUpdateUserName", surgeryFormData.LastUpdateUserName);
            postAddCmd.CommandType = System.Data.CommandType.Text;
            postAddCmd.Connection = cnn1;
            postAddCmd.ExecuteNonQuery();
            return "Saved";
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return "Error";
        }
    }
    // todo - add 20 minutes to the arrival time for setup time
    private bool checkIfSurgeryRoomOccupied(SurgeriesCalendarClass _surgeryCalendar)
    {
        try
        {
            using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
            {
                string oString = "SELECT [Row_ID],[SurgeryRoomDetails],[RequestedDepartmentDetails],[ArrivalDate],[ArrivalTime],[EndTime],[SurgeonDoctor] FROM [NAMER].[dbo].[SurgeriesCalendar] WHERE ArrivalDate = '" + _surgeryCalendar.ArrivalDate + "' AND SurgeryRoomDetails = '" + _surgeryCalendar.SurgeryRoom + "' AND ArrivalTime <= '" + _surgeryCalendar.ArrivalTime + "' AND EndTime >= '" + _surgeryCalendar.EndTime + "'";
                SqlCommand oCmd = new SqlCommand(oString, myConnection);
                myConnection.Open();
                using (SqlDataReader oReader = oCmd.ExecuteReader())
                {
                    while (oReader.Read())
                    {
                        SurgeriesCalendarClass _surgery = new SurgeriesCalendarClass();
                        _surgery.Row_ID = oReader["Row_ID"].ToString().Trim();
                        _surgery.ArrivalDate = oReader["ArrivalDate"].ToString().Trim();
                        _surgery.ArrivalTime = oReader["ArrivalTime"].ToString().Trim();
                        _surgery.EndTime = oReader["EndTime"].ToString().Trim();
                        return true;
                    }
                    myConnection.Close();
                }
            }
            return false;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return false;
        }
    }
    private Int32 newPatientRecord(SurgeryPatientDetails _patientDetails)
    {
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            string newSurgerySQLString = "IF NOT EXISTS (SELECT [PM_ROW_ID],[PM_CASE_NUMBER],[PM_MOVE_DEPART_SEODE],[PM_PATIENT_GENDER],[PM_LAST_NAME],[PM_FIRST_NAME],[PM_DOB],[PM_PATIENT_ID] FROM [NAMER].[dbo].[SurgeriesCalendarPatients] where PM_CASE_NUMBER = '" + _patientDetails.PM_CASE_NUMBER + "') BEGIN INSERT INTO [dbo].[SurgeriesCalendarPatients]([PM_CASE_NUMBER],[PM_MOVE_DEPART_SEODE],[PM_PATIENT_GENDER],[PM_LAST_NAME],[PM_FIRST_NAME],[PM_DOB],[PM_PATIENT_ID]) VALUES (@PM_CASE_NUMBER,@SurgeriesCalendarIDFK,@PM_PATIENT_GENDER,@PM_LAST_NAME,@PM_FIRST_NAME,@PM_DOB,@PM_PATIENT_ID); SELECT CAST(scope_identity() AS int); END ELSE BEGIN SELECT [PM_ROW_ID] FROM [NAMER].[dbo].[SurgeriesCalendarPatients] where PM_CASE_NUMBER = '" + _patientDetails.PM_CASE_NUMBER + "' SELECT CAST(scope_identity() AS int); END";
            cnn1.Open();
            SqlCommand postAddCmd = new SqlCommand(newSurgerySQLString);
            postAddCmd.Parameters.AddWithValue("@PM_CASE_NUMBER", _patientDetails.PM_CASE_NUMBER);
            postAddCmd.Parameters.AddWithValue("@SurgeriesCalendarIDFK", _patientDetails.SurgeriesCalendarIDFK);
            postAddCmd.Parameters.AddWithValue("@PM_PATIENT_GENDER", _patientDetails.PM_PATIENT_GENDER);
            postAddCmd.Parameters.AddWithValue("@PM_LAST_NAME", _patientDetails.PM_LAST_NAME);
            postAddCmd.Parameters.AddWithValue("@PM_FIRST_NAME", _patientDetails.PM_FIRST_NAME);
            postAddCmd.Parameters.AddWithValue("@PM_DOB", _patientDetails.PM_DOB);
            postAddCmd.Parameters.AddWithValue("@PM_PATIENT_ID", _patientDetails.PM_PATIENT_ID);
            postAddCmd.CommandType = System.Data.CommandType.Text;
            postAddCmd.Connection = cnn1;
            return Convert.ToInt32(postAddCmd.ExecuteScalar());
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return 0;
        }
    }
    public List<SurgeryPatientDetails> getSurgeryCalendarPatientDetailsByIdNumber(string IDNumber)
    {
        List<SurgeryPatientDetails> _patientList = new List<SurgeryPatientDetails>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            // send details about the surgery if the patient has a record !!
            string oString = "IF (SELECT COUNT(PM_ROW_ID) FROM [NAMER].[dbo].[SurgeriesCalendarPatients] WHERE PM_PATIENT_ID = '" + IDNumber + "') = 0 SELECT TOP 1[PM_ROW_ID],[PM_CASE_NUMBER],[SurgeriesCalendarIDFK],[PM_PATIENT_GENDER],[PM_LAST_NAME],[PM_FIRST_NAME],DATEDIFF(YEAR,[PM_DOB], GETDATE())AS[PM_DOB],[PM_PATIENT_ID],'NoSurgeryRecord'AS [RecordExists] FROM [NAMER].[dbo].[PATIENT_MONITORING] WHERE[PM_PATIENT_ID] = '" + IDNumber + "' ORDER BY[PM_MOVE_DATE] DESC, [PM_MOVE_TIME] DESC ELSE SELECT TOP 1 A.[PM_ROW_ID],A.[PM_CASE_NUMBER],A.[SurgeriesCalendarIDFK],A.[PM_PATIENT_GENDER],A.[PM_LAST_NAME],A.[PM_FIRST_NAME],A.[PM_DOB],A.[PM_PATIENT_ID],'SurgeryRecord'AS [RecordExists] FROM [NAMER].[dbo].[SurgeriesCalendarPatients] A INNER JOIN[NAMER].[dbo].[SurgeriesCalendar] B ON A.SurgeriesCalendarIDFK = B.Row_ID WHERE[PM_PATIENT_ID] = '" + IDNumber + "'";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeryPatientDetails _patient = new SurgeryPatientDetails();
                    _patient.PM_ROW_ID = oReader["PM_ROW_ID"].ToString().Trim();
                    _patient.PM_CASE_NUMBER = oReader["PM_CASE_NUMBER"].ToString().Trim();
                    _patient.PM_PATIENT_GENDER = oReader["PM_PATIENT_GENDER"].ToString().Trim();
                    _patient.SurgeriesCalendarIDFK = oReader["SurgeriesCalendarIDFK"].ToString().Trim();
                    _patient.PM_LAST_NAME = oReader["PM_LAST_NAME"].ToString().Trim();
                    _patient.PM_FIRST_NAME = oReader["PM_FIRST_NAME"].ToString().Trim();
                    _patient.PM_DOB = oReader["PM_DOB"].ToString().Trim();
                    _patient.PM_PATIENT_ID = oReader["PM_PATIENT_ID"].ToString().Trim();
                    _patient.RECORD_EXISTS = oReader["RecordExists"].ToString().Trim();
                    _patientList.Add(_patient);
                }
                myConnection.Close();
            }
        }
        return _patientList;
    }






    public class BillingPipelineResult
    {
        public string serviceCode { get; set; }
        public decimal price { get; set; }
        public List<string> icd9Codes { get; set; }
        public List<string> drgCodes { get; set; }
    }

    public BillingPipelineResult BillingPipelineResolveServiceCode(
        string hosp_report,
        string diagnosis,
        string department,
        string surgery_date,
        string hospitalization_date,
        string release_date,
        string check_in_type,
        List<string> icd9_diagnosis)
    {
        const string baseUrl = "https://d1xxyoxurq9u57.cloudfront.net";

        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;

        //=========================
        // API 1
        //=========================

        var api1Body = new
        {
            hosp_report = hosp_report,
            diagnosis = diagnosis,
            department = department
        };

        HttpWebRequest request1 =
            (HttpWebRequest)WebRequest.Create(baseUrl + "/api/text-to-icd9");

        request1.Method = "POST";
        request1.ContentType = "application/json";
        request1.Timeout = 65000;

        using (StreamWriter sw = new StreamWriter(request1.GetRequestStream()))
        {
            sw.Write(JsonConvert.SerializeObject(api1Body));
        }

        string response1;

        using (HttpWebResponse response = (HttpWebResponse)request1.GetResponse())
        using (StreamReader sr = new StreamReader(response.GetResponseStream()))
        {
            response1 = sr.ReadToEnd();
        }

        JObject json1 = JObject.Parse(response1);

        JArray icd9Codes =
            (JArray)json1["icd9_codes"];

        JObject primary =
            (JObject)json1["is_primary_procedure"];

        //=========================
        // API 2
        //=========================

        var api2Body = new
        {
            icd9_codes = icd9Codes,
            is_primary_procedure = primary,
            icd9_diagnosis = icd9_diagnosis,
            hospitalization_date = hospitalization_date,
            surgery_date = surgery_date,
            release_date = release_date,
            check_in_type = check_in_type
        };

        HttpWebRequest request2 =
            (HttpWebRequest)WebRequest.Create(baseUrl + "/api/icd9-to-drg");

        request2.Method = "POST";
        request2.ContentType = "application/json";
        request2.Timeout = 65000;

        using (StreamWriter sw = new StreamWriter(request2.GetRequestStream()))
        {
            sw.Write(JsonConvert.SerializeObject(api2Body));
        }

        string response2;

        using (HttpWebResponse response = (HttpWebResponse)request2.GetResponse())
        using (StreamReader sr = new StreamReader(response.GetResponseStream()))
        {
            response2 = sr.ReadToEnd();
        }

        JObject json2 = JObject.Parse(response2);

        string chosen = "";

        if (json2["chosen_service_code"] != null)
        {
            chosen = json2["chosen_service_code"].ToString();
        }
        decimal price = 0;

        JObject prices =
            (JObject)json2["service_code_prices"];

        if (prices != null &&
            prices[chosen] != null)
        {
            decimal.TryParse(
                prices[chosen].ToString(),
                out price);
        }

        return new BillingPipelineResult
        {
            serviceCode = chosen,
            price = price,
            icd9Codes = icd9Codes.ToObject<List<string>>(),
            drgCodes = json2["drg_codes"].ToObject<List<string>>()
        };
    }



































    public List<SurgeriesExcelFile> getSurgeriesPlannedExcel(string Department, string _surRoomCode, string date)
    {

        List<SurgeriesExcelFile> _dataList = new List<SurgeriesExcelFile>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            // send details about the surgery if the patient has a record !!
            string oString = "SELECT DISTINCT B.PM_CASE_NUMBER AS [casenumber],A.ArrivalTime,A.SurgeryRoomDetails AS [room],CONCAT(REPLACE(B.PM_FIRST_NAME,' ',''),' ', REPLACE(B.PM_LAST_NAME,' ',''),' / ', REPLACE(B.PM_PATIENT_ID,' ' ,'')) AS [id], B.PM_DOB AS [age],STUFF((SELECT ', ' + LTRIM(RTRIM(S2.Surgery_Code)) FROM NAMER.dbo.SurgeriesCalendar_Surgeries AS S2 WHERE A.Row_ID = S2.SurgeriesCalendarIDFK ORDER BY LTRIM(RTRIM(S2.Surgery_Code)) FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS[code],STUFF((SELECT ', ' + LTRIM(RTRIM(S3.Surgery_Name)) + ' (' + LTRIM(RTRIM(ISNULL(S3.Side, ''))) + ')' FROM NAMER.dbo.SurgeriesCalendar_Surgeries AS S3 WHERE A.Row_ID = S3.SurgeriesCalendarIDFK ORDER BY LTRIM(RTRIM(S3.Surgery_Name)) FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS[s_name],ISNULL(A.LEYING_POSITION, '') AS [position], CASE WHEN A.[ISOLATION] = 0 THEN 'לא' ELSE 'כן' END AS[isolation], CASE WHEN A.BLOOD_BANK = 0 THEN 'לא' ELSE 'כן' END AS[blood], ISNULL(concat(D.UserFirstName,', ',D.UserLastName), '') AS[doctor], ISNULL(A.NOTE, '') AS[note], B.PM_PATIENT_ID AS[id2], ( SELECT CONCAT(SCT.Tool_Name, '-', SCT.Tool_Need, ',') FROM SurgeriesCalendarTools AS SCT WHERE SCT.SurgeriesCalendarIDFK = A.Row_ID FOR XML PATH('') ) AS[tools], ISNULL(A.ANESTHESIA, '') AS[anesthesia], CASE WHEN A.DIMOT = 0 THEN 'לא' ELSE 'כן' END AS[dimot], CASE    WHEN A.Urgency = N'אמבולטורי'   THEN N'אמבולטורי'  WHEN NULLIF(LTRIM(RTRIM(HOSPITALIZATION)), N'') IS NOT NULL THEN HOSPITALIZATION ELSE A.RequestedDepartmentDetails END AS [hospitalization], ISNULL(A.AvgDauration,  A.Duration) as [duration], AvgDauration FROM SurgeriesCalendar A INNER JOIN SurgeriesCalendarPatients B ON A.Row_ID = B.SurgeriesCalendarIDFK LEFT JOIN SurgeriesCalendar_Surgeries C ON A.Row_ID = C.SurgeriesCalendarIDFK left join NAMER_USERS D on A.SurgeonDoctor = D.VMA and D.StatusDescription = 'לא נעול' and D.VMA <> '' WHERE A.ArrivalDate = '" + date + "' and A.SurgeryStatus <> 'Canceled' and A.RequestedDepartmentDetails IN (" + Department + ") /*AND [SurgeryRoomDetails] IN (SELECT [SurgeryRoom] FROM [NAMER].[dbo].[SurgeriesRoomDesc] WHERE [CalendarRoomsArea] = '" + _surRoomCode + "')*/ AND A.SurgeryRoomDetails = '" + _surRoomCode + "' /*AND (A.NoteTypeRequest IS NULL OR A.NoteTypeRequest = '' OR A.NoteTypeRequest <> 'Delayed')*/ ORDER BY 2 ASC";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesExcelFile _data = new SurgeriesExcelFile();
                    _data.casenumber = oReader["casenumber"].ToString().Trim();
                    _data.room = oReader["room"].ToString().Trim();
                    _data.id = oReader["id"].ToString().Trim();
                    _data.age = oReader["age"].ToString().Trim();
                    _data.code = oReader["code"].ToString().Trim();
                    _data.s_name = oReader["s_name"].ToString().Trim();
                    _data.position = oReader["position"].ToString().Trim();
                    _data.isolation = oReader["isolation"].ToString().Trim();
                    _data.blood = oReader["blood"].ToString().Trim();
                    _data.doctor = oReader["doctor"].ToString().Trim();
                    _data.note = oReader["note"].ToString().Trim();
                    _data.id2 = oReader["id2"].ToString().Trim();
                    _data.tools = oReader["tools"].ToString().Trim();
                    _data.anesthesia = oReader["anesthesia"].ToString().Trim();
                    _data.dimot = oReader["dimot"].ToString().Trim();
                    _data.hospitalization = oReader["hospitalization"].ToString().Trim();
                    _data.duration = oReader["duration"].ToString().Trim();
                    _data.AvgDauration = oReader["AvgDauration"].ToString().Trim();
                    _dataList.Add(_data);
                }
                myConnection.Close();
            }
        }
        return _dataList;
    }

    public List<SurgeriesExcelFile> _old_getSurgeriesPlannedExcel(string Department, string _surRoomCode, string date)
    {
        List<SurgeriesExcelFile> _dataList = new List<SurgeriesExcelFile>();
        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            // send details about the surgery if the patient has a record !!
            string oString = "SELECT DISTINCT B.PM_CASE_NUMBER AS [casenumber],A.ArrivalTime,A.SurgeryRoomDetails AS [room],CONCAT(REPLACE(B.PM_FIRST_NAME,' ',''),' ', REPLACE(B.PM_LAST_NAME,' ',''),' / ', REPLACE(B.PM_PATIENT_ID,' ' ,'')) AS [id], B.PM_DOB AS [age],STUFF((SELECT ', ' + LTRIM(RTRIM(S2.Surgery_Code)) FROM NAMER.dbo.SurgeriesCalendar_Surgeries AS S2 WHERE A.Row_ID = S2.SurgeriesCalendarIDFK ORDER BY LTRIM(RTRIM(S2.Surgery_Code)) FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS[code],STUFF((SELECT ', ' + LTRIM(RTRIM(S3.Surgery_Name)) + ' (' + LTRIM(RTRIM(ISNULL(S3.Side, ''))) + ')' FROM NAMER.dbo.SurgeriesCalendar_Surgeries AS S3 WHERE A.Row_ID = S3.SurgeriesCalendarIDFK ORDER BY LTRIM(RTRIM(S3.Surgery_Name)) FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS[s_name],ISNULL(A.LEYING_POSITION, '') AS [position], CASE WHEN A.[ISOLATION] = 0 THEN 'לא' ELSE 'כן' END AS[isolation], CASE WHEN A.BLOOD_BANK = 0 THEN 'לא' ELSE 'כן' END AS[blood], ISNULL(concat(D.UserFirstName,', ',D.UserLastName), '') AS[doctor], ISNULL(A.NOTE, '') AS[note], B.PM_PATIENT_ID AS[id2], ( SELECT CONCAT(SCT.Tool_Name, '-', SCT.Tool_Need, ',') FROM SurgeriesCalendarTools AS SCT WHERE SCT.SurgeriesCalendarIDFK = A.Row_ID FOR XML PATH('') ) AS[tools], ISNULL(A.ANESTHESIA, '') AS[anesthesia], CASE WHEN A.DIMOT = 0 THEN 'לא' ELSE 'כן' END AS[dimot], CASE WHEN A.Urgency = 'אמבולטורי' THEN 'אמבולטורי' ELSE A.RequestedDepartmentDetails END AS[hospitalization] , ISNULL(A.Duration, '') as [duration] FROM SurgeriesCalendar A INNER JOIN SurgeriesCalendarPatients B ON A.Row_ID = B.SurgeriesCalendarIDFK LEFT JOIN SurgeriesCalendar_Surgeries C ON A.Row_ID = C.SurgeriesCalendarIDFK left join NAMER_USERS D on A.SurgeonDoctor = D.VMA and D.StatusDescription = 'לא נעול' and D.VMA <> '' WHERE A.ArrivalDate = '" + date + "' and A.SurgeryStatus <> 'Canceled' and A.RequestedDepartmentDetails = '" + Department + "' /*AND [SurgeryRoomDetails] IN (SELECT [SurgeryRoom] FROM [NAMER].[dbo].[SurgeriesRoomDesc] WHERE [CalendarRoomsArea] = '" + _surRoomCode + "')*/ AND A.SurgeryRoomDetails = '" + _surRoomCode + "' AND (A.NoteTypeRequest IS NULL OR A.NoteTypeRequest = '' OR A.NoteTypeRequest <> 'Delayed') ORDER BY 2 ASC";
            SqlCommand oCmd = new SqlCommand(oString, myConnection);
            myConnection.Open();
            using (SqlDataReader oReader = oCmd.ExecuteReader())
            {
                while (oReader.Read())
                {
                    SurgeriesExcelFile _data = new SurgeriesExcelFile();
                    _data.casenumber = oReader["casenumber"].ToString().Trim();
                    _data.room = oReader["room"].ToString().Trim();
                    _data.id = oReader["id"].ToString().Trim();
                    _data.age = oReader["age"].ToString().Trim();
                    _data.code = oReader["code"].ToString().Trim();
                    _data.s_name = oReader["s_name"].ToString().Trim();
                    _data.position = oReader["position"].ToString().Trim();
                    _data.isolation = oReader["isolation"].ToString().Trim();
                    _data.blood = oReader["blood"].ToString().Trim();
                    _data.doctor = oReader["doctor"].ToString().Trim();
                    _data.note = oReader["note"].ToString().Trim();
                    _data.id2 = oReader["id2"].ToString().Trim();
                    _data.tools = oReader["tools"].ToString().Trim();
                    _data.anesthesia = oReader["anesthesia"].ToString().Trim();
                    _data.dimot = oReader["dimot"].ToString().Trim();
                    _data.hospitalization = oReader["hospitalization"].ToString().Trim();
                    _data.duration = oReader["duration"].ToString().Trim();
                    _dataList.Add(_data);
                }
                myConnection.Close();
            }
        }
        return _dataList;
    }
    public string getSurgeryDepartmentManager(string _department)
    {
        try
        {
            string manager = "";
            using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
            {
                // send details about the surgery if the patient has a record !!
                string oString = "select c.First_Name, c.Last_Name, c.Login_Name,a.Namer_ID,a.Depart_Name, a.SurgeryDepartName,a.GroupNamer_ID,a.GroupName,a.GroupNamerHosp_ID,a.GroupNameHosp,a.ChameleonUnitID,a.ChameleonSurgeryDepartName from NAMER_DEPARTS a left join [SRV-CP-DB-3].[Chameleon].[dbo].[SystemUnits] b on a.ChameleonUnitID = b.Unit left join [SRV-CP-DB-3].[Chameleon].[dbo].[Users] c on b.Manager = c.Code where a.Depart_Name = '" + _department + "' and a.ChameleonSurgeryDepartName is not null";
                SqlCommand oCmd = new SqlCommand(oString, myConnection);
                myConnection.Open();
                using (SqlDataReader oReader = oCmd.ExecuteReader())
                {
                    while (oReader.Read())
                    {
                        SurgeriesExcelFile _data = new SurgeriesExcelFile();
                        manager = oReader["Login_Name"].ToString().Trim();
                    }
                    myConnection.Close();
                }
            }
            return manager;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return "";
        }
    }
    /*

UPDATE SC
SET 
SC.ArrivalDate=Addr.SurgeryDate,
SC.ArrivalTime=Addr.TimeSurgeryToDo,
SC.SurgeryRoomDetails = Addr.SurgeryRoom
FROM [NAMER].[dbo].[SurgeriesCalendar] SC
INNER JOIN
SurgeriesRealTime Addr
ON SC.surgeryRealTimeRowID = Addr.SurgeryID



select * from SurgeriesRealTime WHERE [SurgeryID] = '0208638042'



select distinct surgery.S_ROW_ID,main.PatientId,room.SurgeryRoom,department.S_DEPARTMENT,main.SurgeryDate,main.TimeSurgeryToDo
,DATEADD(minute, avgTime.ProcedureAvg, main.TimeSurgeryToDo) AS ProcedureAvgHours,
'' as [SurgeonDoctor],'' as [LAP_OR_OPEN],'' as [SIDE],'' as [LEYING_POSITION],0 as [ISOLATION],0 as [BLOOD_BANK],'' as [NOTE],'' as [TOOLS],'' as [ANESTHESIA],0 as [DIMOT]
,'' as [HOSPITALIZATION],GETDATE() AS UpdateDateTime,'system' AS UserName, main.SurgeryID 
from [NAMER].[dbo].[SurgeriesRealTime] main inner join [NAMER].[dbo].[SERVICES_NAME] surgery on main.SurgeryCode = surgery.S_ID
inner join [NAMER].[dbo].[SurgeriesRoomDesc] room on main.SurgeryRoom = room.SurgeryRoom
inner join [NAMER].[dbo].[SURGERIES_DEPARTMENT] department on main.DepartName = department.S_DEPARTMENT_SHORT_DESC
inner join VW_SurgeryProcedureAvg avgTime on main.SurgeryCode = avgTime.S_SURGERY_CODE
where    main.SurgeryDate = format(GETDATE(), 'yyyy-MM-dd') and [SurgeryID] = '0208638042'*/














    private static Dictionary<string, object> ReadFirstRow(SqlDataReader rd)
    {
        if (!rd.Read()) return null;
        var row = new Dictionary<string, object>();
        for (int i = 0; i < rd.FieldCount; i++)
            row[rd.GetName(i)] = rd.IsDBNull(i) ? null : rd.GetValue(i);
        return row;
    }

    private static List<Dictionary<string, object>> ReadAllRows(SqlDataReader rd)
    {
        var list = new List<Dictionary<string, object>>();
        while (rd.Read())
        {
            var row = new Dictionary<string, object>();
            for (int i = 0; i < rd.FieldCount; i++)
                row[rd.GetName(i)] = rd.IsDBNull(i) ? null : rd.GetValue(i);
            list.Add(row);
        }
        return list;
    }


    string RoeiConnStr = "Data Source=SRV-APPDB;Initial Catalog=ROEI;User ID=hrd;Password=3*MFydzDx4%@#AS;";





    public object GetDepartmentPlanReturn(string planDate, string roomCode, string department, string calendarRoomsArea)
    {
        using (var conn = new SqlConnection(RoeiConnStr))
        using (var cmd = new SqlCommand("sp_GetSurgeryArrangementComment", conn))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@PlanDate", planDate);
            cmd.Parameters.AddWithValue("@RoomCode", roomCode);
            cmd.Parameters.AddWithValue("@Department", department);
            cmd.Parameters.AddWithValue("@CalendarRoomsArea", calendarRoomsArea);
            conn.Open();
            using (var rd = cmd.ExecuteReader())
            {
                var header = ReadFirstRow(rd);
                rd.NextResult();
                var surgeries = ReadAllRows(rd);
                return new { header = header, surgeries = surgeries };
            }
        }
    }




    public object GetDepartmentPlanReturnById(string returnId)
    {
        using (var conn = new SqlConnection(RoeiConnStr))
        using (var cmd = new SqlCommand("sp_GetSurgeryArrangementCommentByGroup", conn))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ReturnGroupId", returnId);
            conn.Open();
            using (var rd = cmd.ExecuteReader())
            {
                var header = ReadFirstRow(rd);
                rd.NextResult();
                var surgeries = ReadAllRows(rd);
                return new { header = header, surgeries = surgeries };
            }
        }
    }

    public object SaveDepartmentPlanReturn(string returnId, string planDate, string roomCode, string department,
    string departmentDisplay, string calendarRoomsArea, string generalComment, string sentBy, string rowsJson)
    {
        using (var conn = new SqlConnection(RoeiConnStr))
        using (var cmd = new SqlCommand("sp_SaveSurgeryArrangementComment", conn))
        {
            cmd.CommandType = CommandType.StoredProcedure;

            var pReturnId = cmd.Parameters.Add("@ReturnGroupId", SqlDbType.UniqueIdentifier);
            pReturnId.Direction = ParameterDirection.InputOutput;
            pReturnId.Value = string.IsNullOrEmpty(returnId) ? (object)DBNull.Value : new Guid(returnId);

            cmd.Parameters.AddWithValue("@PlanDate", planDate);
            cmd.Parameters.AddWithValue("@RoomCode", roomCode);
            cmd.Parameters.AddWithValue("@Department", department);
            cmd.Parameters.AddWithValue("@DepartmentDisplay", (object)departmentDisplay ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@CalendarRoomsArea", calendarRoomsArea);
            cmd.Parameters.AddWithValue("@GeneralComment", (object)generalComment ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@SentBy", (object)sentBy ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RowsJson", rowsJson);

            conn.Open();
            cmd.ExecuteNonQuery();

            var newId = (Guid)pReturnId.Value;
            return new { returnId = newId.ToString() };
        }
    }

    public object SaveDepartmentPlanReturnResponse(string returnId, string generalResponseText, string respondedBy, string rowsJson)
    {
        using (var conn = new SqlConnection(RoeiConnStr))
        using (var cmd = new SqlCommand("sp_SaveSurgeryArrangementCommentResponse", conn))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ReturnGroupId", returnId);
            cmd.Parameters.AddWithValue("@GeneralResponseText", (object)generalResponseText ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RespondedBy", (object)respondedBy ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@RowsJson", rowsJson);
            conn.Open();
            cmd.ExecuteNonQuery();
            return new { success = true };
        }
    }

    public object GetDepartmentPlanReturnReport(string fromDate, string toDate, string[] departments, string treatmentStatus, bool includeDeleted)
    {
        string departmentsCsv = (departments != null && departments.Length > 0)
            ? string.Join(",", departments)
            : null;

        using (var conn = new SqlConnection(RoeiConnStr))
        using (var cmd = new SqlCommand("sp_GetSurgeryArrangementCommentReport", conn))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@FromDate", fromDate);
            cmd.Parameters.AddWithValue("@ToDate", toDate);
            cmd.Parameters.AddWithValue("@Departments", (object)departmentsCsv ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@TreatmentStatus", (object)treatmentStatus ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@IncludeDeleted", includeDeleted);
            conn.Open();
            using (var rd = cmd.ExecuteReader())
            {
                return ReadAllRows(rd);
            }
        }
    }

    public bool SendDepartmentPlanReturnToDepartment(string returnId, string sentBy, string department,
            string fileString, string arrivalDate, string calendarRoomsArea, string detailedText, Nurses.UsersClass[] users)
    {
        try
        {
            using (var conn = new SqlConnection(RoeiConnStr))
            using (var cmd = new SqlCommand("sp_MarkSurgeryArrangementCommentSent", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@ReturnGroupId", returnId);
                cmd.Parameters.AddWithValue("@SentBy", sentBy);
                conn.Open();
                cmd.ExecuteNonQuery();
            }

            string folder = @"C:\pdf\DepartmentPlanReturn";
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            string dateTime = DateTime.Now.ToString("yyyyMMddHHmmss");
            string htmlFile = Path.Combine(folder, "temp_" + dateTime + ".html");
            string tempPdfPath = Path.Combine(folder, "הערה על הסידור " + department + " _ " + dateTime + ".pdf");

            File.WriteAllText(htmlFile, fileString, Encoding.UTF8);

            Process p = new Process();
            p.StartInfo.FileName = @"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe";
            p.StartInfo.Arguments = "--enable-local-file-access -O Landscape \"" + htmlFile + "\" \"" + tempPdfPath + "\"";
            p.StartInfo.CreateNoWindow = true;
            p.StartInfo.UseShellExecute = false;
            p.Start();
            p.WaitForExit();
            File.Delete(htmlFile);

            MailMessage mail = new MailMessage();
            SmtpClient SmtpServer = new SmtpClient("172.19.19.10");
            mail.From = new MailAddress("sqladmin@tzmc.gov.il");
            mail.Priority = MailPriority.Normal;
            for (int i = 0; i < users.Length; i++)
            {
                mail.To.Add(users[i].Email);
            }
            mail.Subject = "הערה על הסידור - " + department + " - " + arrivalDate + " - " + calendarRoomsArea;
            mail.IsBodyHtml = true;
            mail.Body = detailedText; // טקסט מפורט בגוף המייל, בנוסף ל-PDF המצורף

            System.Net.Mail.Attachment attachment = new System.Net.Mail.Attachment(tempPdfPath);
            mail.Attachments.Add(attachment);
            SmtpServer.Send(mail);

            return true;
        }
        catch (Exception ex)
        {
            throw new Exception("SendDepartmentPlanReturnToDepartment failed: " + ex.Message, ex);
        }
    }


































    public bool sentDepartmentFinalSurgeryPlan(string department, string fileString, string arrivalDate, string calendarRoomsArea, Nurses.UsersClass[] users)
    {
        try
        {
            string folder = @"C:\pdf\FinalSurgeryPlan";
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            string dateTime = DateTime.Now.ToString("yyyyMMddHHmmss");
            string htmlFile = Path.Combine(folder, "temp_" + dateTime + ".html");
            string tempPdfPath = Path.Combine(folder, "תוכנית סופית למחלקת " + department + " _ " + dateTime + ".pdf");

            File.WriteAllText(htmlFile, fileString, Encoding.UTF8);

            Process p = new Process();
            p.StartInfo.FileName = @"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe";
            p.StartInfo.Arguments = "--enable-local-file-access -O Landscape \"" + htmlFile + "\" \"" + tempPdfPath + "\"";
            p.StartInfo.CreateNoWindow = true;
            p.StartInfo.UseShellExecute = false;
            p.Start();
            p.WaitForExit();
            File.Delete(htmlFile);

            MailMessage mail = new MailMessage();
            SmtpClient SmtpServer = new SmtpClient("172.19.19.10");
            mail.From = new MailAddress("sqladmin@tzmc.gov.il");
            mail.Priority = MailPriority.Normal;
            for (int i = 0; i < users.Length; i++)
            {
                mail.To.Add(users[i].Email);
            }
            mail.Subject = "אישור תוכנית סופית למחלקת " + department + " - " + arrivalDate + " - " + calendarRoomsArea;
            mail.IsBodyHtml = true;
            System.Net.Mail.Attachment attachment = new System.Net.Mail.Attachment(tempPdfPath);
            mail.Attachments.Add(attachment);
            SmtpServer.Send(mail);

            return true;
        }
        catch (Exception ex)
        {
            throw new Exception("sentDepartmentFinalSurgeryPlan failed: " + ex.Message, ex);
        }
    }


    public string CreatePlannedFinalSurgeries(string content, string departments)
    {
        string folder = @"C:\pdf\FinalSurgeryPlan";

        if (!Directory.Exists(folder))
            Directory.CreateDirectory(folder);

        string dateTime = DateTime.Now.ToString("yyyyMMddHHmmss");

        string htmlFile = Path.Combine(folder, "temp_" + dateTime + ".html");

        string pdfFile = Path.Combine(folder,
            "תוכנית סופית למחלקת " + departments + " _ " + dateTime + ".pdf");

        File.WriteAllText(htmlFile, content, Encoding.UTF8);

        Process p = new Process();

        p.StartInfo.FileName = @"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe";
        p.StartInfo.Arguments = "--enable-local-file-access -O Landscape \"" +
                                htmlFile + "\" \"" + pdfFile + "\"";

        p.StartInfo.CreateNoWindow = true;
        p.StartInfo.UseShellExecute = false;

        p.Start();

        p.WaitForExit();

        File.Delete(htmlFile);

        return pdfFile;
    }



    // SurgeryArrangementCommentManager.cs
    public object DeleteDepartmentPlanReturn(string returnId, string rowId, string deletedBy)
    {
        using (var conn = new SqlConnection(RoeiConnStr))
        using (var cmd = new SqlCommand("sp_DeleteSurgeryArrangementComment", conn))
        {
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ReturnGroupId", returnId);
            cmd.Parameters.AddWithValue("@RowId", string.IsNullOrEmpty(rowId) ? (object)DBNull.Value : rowId);
            cmd.Parameters.AddWithValue("@DeletedBy", deletedBy);
            conn.Open();
            cmd.ExecuteNonQuery();
            return new { success = true };
        }
    }














































    public bool surgeriesRefreshDataInServer()
    {
        try
        {
            using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
            {
                SqlCommand oCmd = new SqlCommand("[dbo].[UpdateSurgeriesCalendar]", myConnection);
                oCmd.CommandType = CommandType.StoredProcedure;

                oCmd.Parameters.AddWithValue("@StartDate", DateTime.Now.Date);
                oCmd.Parameters.AddWithValue("@EndDate", DateTime.Now.Date);

                // Declare an output parameter
                SqlParameter outputParam = new SqlParameter("@ResultMessage", SqlDbType.NVarChar, 255)
                {
                    Direction = ParameterDirection.Output
                };
                oCmd.Parameters.Add(outputParam);

                myConnection.Open();
                oCmd.ExecuteNonQuery(); // Execute the procedure

                // Retrieve the output value
                string resultMessage = outputParam.Value.ToString();
                Console.WriteLine("Result: " + resultMessage);
            }
            return true;
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
            return false;
        }
    }


    public class SurgeryRoomPriceSummary
    {
        public string SurgeryRoom { get; set; }
        public string RoomGrossPriceTotal { get; set; }
        public string DepartmentDayAverage { get; set; }
    }
    public SurgeriesRoomDayClass GetSurgeriesRoomPricesBySurgeryRoomCode(
    string _fullDate,
    string _surRoomCode)
    {
        SurgeriesRoomDayClass result = new SurgeriesRoomDayClass
        {
            SurgeryPrices = new List<SurgeryPriceItem>(),
            RoomPriceSummaries = new List<SurgeryRoomPriceSummary>()
        };

        using (SqlConnection myConnection = new SqlConnection(connetionStringNAMER))
        {
            string sql = @"
DECLARE @FullDate DATE = @PFullDate;
DECLARE @SurRoomCode NVARCHAR(50) = @PSurRoomCode;

IF OBJECT_ID('tempdb..#Base') IS NOT NULL
    DROP TABLE #Base;

------------------------------------------------------------
-- Build the billing data ONCE (מפוצל לפי ServiceCode)
------------------------------------------------------------
SELECT
    cal.Row_ID,
    CONVERT(date, cal.ArrivalDate) AS WorkDate,
    cal.SurgeryRoomDetails,
    cal.RequestedDepartmentDetails,

    ServiceCode = CAST(COALESCE(
        NULLIF(LTRIM(RTRIM(x.ServiceCode)), ''),
        CASE WHEN dd.LEIST LIKE 'DD%' THEN 'D' + SUBSTRING(LTRIM(RTRIM(dd.LEIST)),3,4) END,
        CASE WHEN v.PrintNote LIKE N'%קוד G%'
             THEN SUBSTRING(v.PrintNote, PATINDEX('%G[0-9][0-9][0-9][0-9]%', v.PrintNote), 5) END,
        scm.NormalizedCode
    ) AS NVARCHAR(20)),

    TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) AS GrossPrice,

    CAST(NULLIF(LTRIM(RTRIM(p.[שם_השירות])), N'') AS NVARCHAR(400)) AS ServiceName,

    CASE
        WHEN
            (v.InvoiceServiceCode IS NULL OR LEN(LTRIM(RTRIM(v.InvoiceServiceCode))) = 0)
            AND dd.LEIST IS NULL
            AND (v.PrintNote IS NULL OR PATINDEX('%G[0-9][0-9][0-9][0-9]%', v.PrintNote) = 0)
        THEN 1
        ELSE 0
    END AS IsEstimated

INTO #Base

FROM NAMER.dbo.SurgeriesCalendar cal WITH(NOLOCK)

LEFT JOIN NAMER.dbo.SurgeriesCalendar_Surgeries scs WITH(NOLOCK)
    ON scs.SurgeryID = cal.SurgeryID

LEFT JOIN NAMER.dbo.V_NLEM v WITH(NOLOCK)
    ON v.LNRLS = cal.SurgeryID
    AND v.LEIST = 'OP_ANCHOR'
    AND v.STORN <> 'X'

OUTER APPLY (
    SELECT CAST('<x>' + REPLACE(v.InvoiceServiceCode, ',', '</x><x>') + '</x>' AS XML) AS xdoc
) AS xmldata

OUTER APPLY (
    SELECT RIGHT(LTRIM(RTRIM(c.value('.', 'nvarchar(50)'))), 5) AS ServiceCode
    FROM xmldata.xdoc.nodes('/x') AS t(c)
    WHERE LTRIM(RTRIM(c.value('.', 'nvarchar(50)'))) <> ''
) AS x   -- כל קוד ← שורה נפרדת (בלי TOP 1)

LEFT JOIN NAMER.dbo.V_NLEM dd WITH(NOLOCK)
    ON dd.FALNR = v.FALNR
    AND dd.PATNR = v.PATNR
    AND dd.IBGDT = CONVERT(date, cal.ArrivalDate)
    AND dd.LEIST LIKE 'DD%'

LEFT JOIN NAMER.dbo.SurgeryCodeFallback scm WITH(NOLOCK)
    ON scm.Surgery_Code = LTRIM(RTRIM(scs.Surgery_Code))

JOIN ROEI.dbo.MOH_PriceList_2026 p WITH(NOLOCK)
    ON p.[קוד_השירות] = CAST(COALESCE(
        NULLIF(LTRIM(RTRIM(x.ServiceCode)), ''),
        CASE WHEN dd.LEIST LIKE 'DD%' THEN 'D' + SUBSTRING(LTRIM(RTRIM(dd.LEIST)),3,4) END,
        CASE WHEN v.PrintNote LIKE N'%קוד G%'
             THEN SUBSTRING(v.PrintNote, PATINDEX('%G[0-9][0-9][0-9][0-9]%', v.PrintNote), 5) END,
        scm.NormalizedCode
    ) AS NVARCHAR(20))

WHERE cal.ArrivalDate >= DATEADD(MONTH, -6, @FullDate)
  AND cal.ArrivalDate < DATEADD(DAY, 1, @FullDate)
  AND cal.ArrivalTime IS NOT NULL
  AND cal.SurgeryStatus <> 'Canceled'
  AND TRY_CONVERT(decimal(18,2), p.[תעריף_ב]) > 0
  AND EXISTS
  (
      SELECT 1
      FROM NAMER.dbo.SurgeriesRoomDesc rd WITH(NOLOCK)
      WHERE rd.SurgeryRoom = cal.SurgeryRoomDetails
        AND rd.RoomGroupDesc = @SurRoomCode
  );

------------------------------------------------------------
-- Index temp table
------------------------------------------------------------
CREATE INDEX IX_Base_Row
ON #Base(Row_ID, ServiceCode);

CREATE INDEX IX_Base_DayRoom
ON #Base(WorkDate, SurgeryRoomDetails, RequestedDepartmentDetails);

------------------------------------------------------------
-- RESULT SET 1
-- כל קוד שירות של הניתוח כשורה נפרדת + סכום לכל קוד
------------------------------------------------------------
SELECT
    Row_ID,
    ServiceCode,
    SUM(GrossPrice) AS GrossPrice,
    MAX(ServiceName) AS ServiceName,
    MAX(IsEstimated) AS IsEstimated
FROM #Base
WHERE WorkDate = @FullDate
GROUP BY Row_ID, ServiceCode
ORDER BY Row_ID, ServiceCode;

------------------------------------------------------------
-- RESULT SET 2
-- Room summaries (מסכם את כל הקודים של כל ניתוח)
------------------------------------------------------------
;WITH PerSurgery AS
(
    SELECT
        Row_ID,
        WorkDate,
        SurgeryRoomDetails,
        RequestedDepartmentDetails,
        SUM(GrossPrice) AS GrossPrice
    FROM #Base
    GROUP BY
        Row_ID,
        WorkDate,
        SurgeryRoomDetails,
        RequestedDepartmentDetails
),

DayRoom AS
(
    SELECT
        WorkDate,
        SurgeryRoomDetails,
        COUNT(DISTINCT RequestedDepartmentDetails) AS DeptCnt,
        MIN(RequestedDepartmentDetails) AS DepartmentCode,
        SUM(ISNULL(GrossPrice, 0)) AS DailyIncome
    FROM PerSurgery
    GROUP BY
        WorkDate,
        SurgeryRoomDetails
),

CurrentDay AS
(
    SELECT
        SurgeryRoomDetails,
        DeptCnt,
        DepartmentCode,
        DailyIncome AS RoomGrossPriceTotal
    FROM DayRoom
    WHERE WorkDate = @FullDate
),

DepartmentAvg AS
(
    SELECT
        SurgeryRoomDetails,
        DepartmentCode,
        CAST(AVG(DailyIncome) AS decimal(18,0)) AS DepartmentDayAverage
    FROM DayRoom
    WHERE WorkDate < @FullDate
      AND DeptCnt = 1
    GROUP BY
        SurgeryRoomDetails,
        DepartmentCode
)

SELECT
    c.SurgeryRoomDetails AS SurgeryRoom,
    CAST(c.RoomGrossPriceTotal AS decimal(18,0)) AS RoomGrossPriceTotal,
    CASE
        WHEN c.DeptCnt = 1 AND c.RoomGrossPriceTotal > 0
        THEN ISNULL(d.DepartmentDayAverage, 0)
        ELSE 0
    END AS DepartmentDayAverage
FROM CurrentDay c
LEFT JOIN DepartmentAvg d
    ON d.SurgeryRoomDetails = c.SurgeryRoomDetails
    AND d.DepartmentCode = c.DepartmentCode
ORDER BY c.SurgeryRoomDetails;
";

            using (SqlCommand cmd = new SqlCommand(sql, myConnection))
            {
                cmd.CommandType = CommandType.Text;
                cmd.CommandTimeout = 120;

                cmd.Parameters.Add("@PFullDate", SqlDbType.Date).Value =
                    DateTime.Parse(_fullDate).Date;

                cmd.Parameters.Add("@PSurRoomCode", SqlDbType.NVarChar, 50).Value =
                    _surRoomCode;

                myConnection.Open();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    //--------------------------------------------------
                    // RESULT SET 1 - SurgeryPrices
                    //--------------------------------------------------
                    Dictionary<string, SurgeryPriceItem> surgeryMap =
     new Dictionary<string, SurgeryPriceItem>();

                    while (reader.Read())
                    {
                        string rowId = reader["Row_ID"].ToString().Trim();

                        string serviceCode =
                            reader["ServiceCode"] == DBNull.Value
                                ? string.Empty
                                : reader["ServiceCode"].ToString().Trim();

                        string grossPrice =
                            reader["GrossPrice"] == DBNull.Value
                                ? "0"
                                : reader["GrossPrice"].ToString().Trim();

                        string serviceName =
                            reader["ServiceName"] == DBNull.Value
                                ? string.Empty
                                : reader["ServiceName"].ToString().Trim();

                        bool isEstimated =
                            reader["IsEstimated"] != DBNull.Value &&
                            Convert.ToInt32(reader["IsEstimated"]) == 1;

                        SurgeryPriceItem item;

                        if (!surgeryMap.TryGetValue(rowId, out item))
                        {
                            item = new SurgeryPriceItem
                            {
                                Row_ID = rowId,
                                IsEstimated = isEstimated
                            };
                            surgeryMap.Add(rowId, item);
                            result.SurgeryPrices.Add(item);
                        }

                        item.Codes.Add(new ServiceCodePrice
                        {
                            ServiceCode = serviceCode,
                            GrossPrice = grossPrice,
                            ServiceName = serviceName
                        });
                    }
                    //--------------------------------------------------
                    // RESULT SET 2 - RoomPriceSummaries
                    //--------------------------------------------------
                    if (reader.NextResult())
                    {
                        while (reader.Read())
                        {
                            SurgeryRoomPriceSummary summary = new SurgeryRoomPriceSummary();

                            summary.SurgeryRoom = reader["SurgeryRoom"].ToString().Trim();

                            summary.RoomGrossPriceTotal =
                                reader["RoomGrossPriceTotal"] == DBNull.Value
                                    ? "0"
                                    : reader["RoomGrossPriceTotal"].ToString().Trim();

                            summary.DepartmentDayAverage =
                                reader["DepartmentDayAverage"] == DBNull.Value
                                    ? "0"
                                    : reader["DepartmentDayAverage"].ToString().Trim();

                            result.RoomPriceSummaries.Add(summary);
                        }
                    }
                }
            }
        }

        return result;
    }


}