using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
/// <summary>
/// Summary description for OnnBiSystem
/// </summary>
public class OnnBiSystem
{
    public class MonthDataExtended
    {
        public int Year { get; set; }
        public int MonthNumber { get; set; }
        public decimal Value { get; set; }
    }
    public class DW_FACTS
    {
        public string FACTID { get; set; }
        public string DIMDataTypeID { get; set; }
        public string DIMDataTypeSubID { get; set; }
        public string Source { get; set; }
        public string PATIENT_NUMBER { get; set; }
        public string CaseNumber { get; set; }
        public string TransactionIdentificationSource { get; set; }
        public string TransactionIdentification { get; set; }
        public string TransactionDateSource { get; set; }
        public string TransactionDate { get; set; }
    }
    public class DW_DimTimeTypesDetails
    {
        public string DimTimeTypesDetailID { get; set; }
        public string DimTimeTypeID { get; set; }
        public string DimTimeTypesDetailDesc { get; set; }
    }
    public class DW_DimTimeTypes
    {
        public string DimTimeTypeID { get; set; }
        public string DimTimeTypeDesc { get; set; }
    }
    public class DW_DIMDataTypes
    {
        public string DIMDataTypeID { get; set; }
        public string DIMDataTypeDesc { get; set; }
    }
    public class DW_DataTypesSub
    {
        public string DIMDataTypeSubDesc { get; set; }
        public string DIMDataTypeSubRoom { get; set; }
    }
    public class PieChart
    {
        public string key { get; set; }
        public string y { get; set; }
        public string title { get; set; }
    }
    public class DiscreteBarChart
    {
        public string label { get; set; }
        public string value { get; set; }
    }
    public class StackedBarChart
    {
        public string key { get; set; }
        public string x { get; set; }
        public int y { get; set; }
    }
    public class LineChart
    {
        public string x { get; set; }
        public string depart { get; set; }
        public int y { get; set; }
    }
    public class StackedBarChart2
    {
        public string key { get; set; }
        public string x { get; set; }
        public int y { get; set; }
    }
    public class TableView
    {
        public string DoctorName { get; set; }
        public string DepartmentName { get; set; }
        public int Q { get; set; }
        public int Actions { get; set; }
    }

    string connetionStringNAMER = "Data Source=SRV-APPDB;Initial Catalog=NAMER;User ID=hrd;Password=3*MFydzDx4%@#AS;";
    public static string changeRate;

    private PieChart getPercentValues(string deptCode, string returnedPatients)
    {
        PieChart category = new PieChart();
        try
        {
            SqlConnection cnn2 = new SqlConnection(connetionStringNAMER);
            string getCategoriesString = "SELECT [DIMDataTypePercent] AS [count] FROM[NAMER].[dbo].[DW_Percent_Data] where DIMDataTypeID = " + deptCode + " and [Status] = 1";
            if (deptCode == "2" && returnedPatients == "True")
            {
                getCategoriesString = "SELECT [DIMDataTypePercent] AS [count] FROM[NAMER].[dbo].[DW_Percent_Data] where DIMDataTypeID = 11 and[Status] = 1";
            }
            cnn2.Open();
            SqlCommand oCmd2 = new SqlCommand(getCategoriesString);
            oCmd2.Connection = cnn2;
            using (SqlDataReader oReader2 = oCmd2.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    string stringVal = oReader2["count"].ToString();
                    float floatVal = float.Parse(stringVal);
                    category.key = "Up";
                    changeRate = "Up";
                    if (floatVal < 1)
                    {
                        category.key = "Down";
                        changeRate = "Down";
                    }
                    //floatVal = Math.Abs((floatVal * 100) - 100);
                    category.y = String.Format("{0:0.00}", floatVal);
                }
                cnn2.Close();
            }
            return category;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return category;
        }
    }
    private PieChart getDhofSurgeriesPercentValues(string deptCode, string returnedPatients, string timeLine)
    {
        PieChart category = new PieChart();
        try
        {
            SqlConnection cnn2 = new SqlConnection(connetionStringNAMER);
            string getCategoriesString = "SELECT [DIMDataTypePercent] AS [count] FROM[NAMER].[dbo].[DW_Percent_Data] where DIMDataTypeID = " + deptCode + " and [TimeLine] = " + timeLine + " and [Status] = 1";
            if (deptCode == "2" && returnedPatients == "True")
            {
                getCategoriesString = "SELECT [DIMDataTypePercent] AS [count] FROM[NAMER].[dbo].[DW_Percent_Data] where DIMDataTypeID = 11 and [TimeLine] = " + timeLine + " and[Status] = 1";
            }
            cnn2.Open();
            SqlCommand oCmd2 = new SqlCommand(getCategoriesString);
            oCmd2.Connection = cnn2;
            using (SqlDataReader oReader2 = oCmd2.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    string stringVal = oReader2["count"].ToString();
                    float floatVal = float.Parse(stringVal);
                    /*category.key = "Up";
                    changeRate = "Up";
                    if (floatVal < 1)
                    {
                        category.key = "Down";
                        changeRate = "Down";
                    }*/
                    //floatVal = Math.Abs((floatVal * 100) - 100);
                    category.y = String.Format("{0:0.00}", floatVal);
                }
                cnn2.Close();
            }
            return category;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return category;
        }
    }
    private PieChart getTotalNumberValues(string deptCode, string returnedPatients)
    {
        PieChart category = new PieChart();

        try
        {
            SqlConnection cnn2 = new SqlConnection(connetionStringNAMER);
            string getCategoriesString = "SELECT [DIMDataTypeValue] AS [count] FROM [NAMER].[dbo].[DW_Percent_Data] where [DIMDataTypeID] = " + deptCode + " and [Status] = 1 and TimeLine is null";
            if (deptCode == "2" && returnedPatients == "True")
            {
                getCategoriesString = "SELECT [DIMDataTypeValue] AS [count] FROM [NAMER].[dbo].[DW_Percent_Data] where [DIMDataTypeID] = 11 and [Status] = 1 and TimeLine is null";
            }
            cnn2.Open();
            SqlCommand oCmd2 = new SqlCommand(getCategoriesString);
            oCmd2.Connection = cnn2;
            using (SqlDataReader oReader2 = oCmd2.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    category.y = oReader2["count"].ToString();
                    category.key = "Up";
                    if (changeRate == "Down")
                    {
                        category.key = "Down";
                    }
                }
                cnn2.Close();
            }
            return category;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return category;
        }
    }
    public List<PieChart> getStatsValues(string deptCode, string returnedPatients, string timeLine)
    {
        List<PieChart> objectsList = new List<PieChart>();
        try
        {
            objectsList.Add(getPercentValues(deptCode, returnedPatients));
            objectsList.Add(getTotalNumberValues(deptCode, returnedPatients));
            if (deptCode == "1")
            {
                objectsList.Add(getDhofSurgeriesPercentValues(deptCode, returnedPatients, timeLine));
            }
            return objectsList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return objectsList;
        }
    }
    public List<PieChart> getHospitalDepartmentsTableChartList(string surgerydeptType)
    {
        List<PieChart> departmentsList = new List<PieChart>();
        try
        {
            SqlConnection cnn2 = new SqlConnection(connetionStringNAMER);
            string getCategoriesString = "SELECT COUNT(a.[PM_CASE_NUMBER])AS OccupancyPerDepart,b.[Depart_Name] FROM [NAMER].[dbo].[PATIENT_MONITORING] a RIGHT JOIN[NAMER].[dbo].[NAMER_DEPARTS] b ON a.[PM_MOVE_DEPART_SEODE] = b.[Namer_ID] AND a.[PM_MOVE_DATE_END] IS NULL WHERE a.[PM_CASE_NUMBER] NOT IN(SELECT[PM_CASE_NUMBER] FROM [NAMER].[dbo].[PATIENT_MONITORING] WHERE[PM_MOVE_CAT] = '2') AND b.[Depts_For_Nurses_Dashboard] = '1' GROUP BY b.[Row_ID],a.[PM_MOVE_DEPART_SEODE],b.[Depart_Name],b.[Namer_ID],b.[number_of_beds],b.[PriorityForNurses] ORDER BY b.[Depart_Name] ASC";
            if (surgerydeptType == "1")
            {
                getCategoriesString = "SELECT COUNT(a.[PM_CASE_NUMBER])AS OccupancyPerDepart,b.[Depart_Name] FROM [NAMER].[dbo].[PATIENT_MONITORING] a RIGHT JOIN[NAMER].[dbo].[NAMER_DEPARTS] b ON a.[PM_MOVE_DEPART] = b.[Namer_ID] AND a.[PM_MOVE_DATE_END] IS NULL WHERE a.[PM_CASE_NUMBER] NOT IN(SELECT[PM_CASE_NUMBER] FROM [NAMER].[dbo].[PATIENT_MONITORING] WHERE[PM_MOVE_CAT] = '2') AND b.[Depts_For_Nurses_Dashboard] = '2' GROUP BY b.[Row_ID],a.[PM_MOVE_DEPART],b.[Depart_Name],b.[Namer_ID],b.[number_of_beds],b.[PriorityForNurses] ORDER BY b.[Depart_Name] ASC";
            }
            cnn2.Open();
            SqlCommand oCmd2 = new SqlCommand(getCategoriesString);
            oCmd2.Connection = cnn2;
            using (SqlDataReader oReader2 = oCmd2.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart category = new PieChart();
                    category.y = oReader2["OccupancyPerDepart"].ToString();
                    category.key = oReader2["Depart_Name"].ToString();
                    departmentsList.Add(category);
                }
                cnn2.Close();
            }
            return departmentsList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return departmentsList;
        }
    }
    public List<DW_DimTimeTypes> getTimeTypes()
    {
        List<DW_DimTimeTypes> categoryList = new List<DW_DimTimeTypes>();
        try
        {
            SqlConnection cnn2 = new SqlConnection(connetionStringNAMER);
            string getCategoriesString = "SELECT [DimTimeTypeID],[DimTimeTypeDesc] FROM [NAMER].[dbo].[DW_DimTimeTypes]";
            cnn2.Open();
            SqlCommand oCmd2 = new SqlCommand(getCategoriesString);
            oCmd2.Connection = cnn2;
            using (SqlDataReader oReader2 = oCmd2.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    DW_DimTimeTypes category = new DW_DimTimeTypes();
                    category.DimTimeTypeID = oReader2["DimTimeTypeID"].ToString();
                    category.DimTimeTypeDesc = oReader2["DimTimeTypeDesc"].ToString();
                    categoryList.Add(category);
                }
                cnn2.Close();
            }
            return categoryList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return categoryList;
        }
    }
    public List<PieChart> getSurgeriesNumberByDepartmentAndTimeLine(string param)
    {
        List<PieChart> aggregationList = new List<PieChart>();
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT c.[DIMDataTypeSubDesc] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = '" + param + "' GROUP BY c.[DIMDataTypeSubDesc]";

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart aggregationelement = new PieChart();
                    aggregationelement.key = oReader2["Department"].ToString();
                    aggregationelement.y = oReader2["Quantity"].ToString();
                    aggregationList.Add(aggregationelement);
                }
                cnn1.Close();
            }
            return aggregationList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return aggregationList;
        }
    }
    public List<PieChart> pieChartMerpaoot(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<PieChart> pieList = new List<PieChart>();
        string searchTime = "";
        string surgeryDepartChange = "";
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(pm.PM_MOVE_DATE) IN (" + temp1 + ")";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode] FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients IN (" + returnedPatients + ") AND [PatientType] IN (" + surgerydeptType + ")";
            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart pieelement = new PieChart();
                    pieelement.key = oReader2["Title"].ToString().Trim();
                    pieelement.y = oReader2["Quantity"].ToString().Trim();
                    pieList.Add(pieelement);
                }
                cnn1.Close();
            }
            return pieList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return pieList;
        }
    }
    public List<PieChart> pieChartDepartments(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<PieChart> pieList = new List<PieChart>();
        string searchTime = "";
        string returned = "";
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(a.PM_MOVE_DATE) IN (" + temp1 + ")";
        }
        switch (param)
        {
            case "1":
                searchTime = "a.PM_MOVE_DATE > DATEADD(DAY,-8,GETDATE()) AND FORMAT(a.PM_MOVE_DATE,'yyyy-MM-dd') <> FORMAT(GETDATE(),'yyyy-MM-dd')";
                break;

            case "2":
                int daysInMonth = System.DateTime.DaysInMonth(DateTime.Now.Year, DateTime.Now.Month);
                searchTime = "a.PM_MOVE_DATE > DATEADD(DAY,-" + daysInMonth.ToString() + ",GETDATE()) AND FORMAT(a.PM_MOVE_DATE,'yyyy-MM-dd') <> FORMAT(GETDATE(),'yyyy-MM-dd')";
                break;

            case "3":
                searchTime = "a.PM_MOVE_DATE > DATEADD(MONTH,-12,GETDATE())  AND FORMAT(a.PM_MOVE_DATE,'yyyy-MM') <> FORMAT(GETDATE(),'yyyy-MM')";
                break;

            case "4":
                searchTime = "a.PM_MOVE_DATE > DATEADD(year,-5,GETDATE()) AND MONTH(a.PM_MOVE_DATE) BETWEEN '01' AND MONTH(GETDATE()) - 1";
                break;
            case "5":
                searchTime = "a.PM_MOVE_DATE > DATEADD(year,-5,GETDATE()) AND YEAR(a.PM_MOVE_DATE) <> YEAR(GETDATE())";
                break;
        }
        if (returnedPatients == "True")
        {
            returned = " and DATEDIFF(day,a.PM_LAST_ESHPOZE_DATE,a.PM_MOVE_DATE) <= 7";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode] FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + "";
            if (surgerydeptType == "1")
            {
                cmdString = "SELECT top 10 b.Depart_Name as [Title], COUNT(DISTINCT(a.PM_CASE_NUMBER))as [Quantity] FROM [NAMER].[dbo].[PATIENT_MONITORING] a WITH(ROWLOCK) INNER JOIN NAMER_DEPARTS b WITH(ROWLOCK) ON a.PM_MOVE_DEPART = b.Namer_ID WHERE " + searchTime + period + returned + " and b.Depts_For_Nurses_Dashboard = 2 AND ((a.[PM_MOVE_CAT] = '1' AND (a.[PM_MOVE_TYPE] = '01' OR a.[PM_MOVE_TYPE] = '03')) OR (a.[PM_MOVE_CAT] = '3' AND (a.[PM_MOVE_TYPE] = '60' OR a.[PM_MOVE_TYPE] = '30'))) GROUP BY b.Depart_Name ORDER BY COUNT(DISTINCT(a.PM_CASE_NUMBER)) DESC";
            }

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart pieelement = new PieChart();
                    pieelement.key = oReader2["Title"].ToString().Trim();
                    pieelement.y = oReader2["Quantity"].ToString().Trim();
                    pieList.Add(pieelement);
                }
                cnn1.Close();
            }
            return pieList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return pieList;
        }
    }
    public List<PieChart> pieChart(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<PieChart> pieList = new List<PieChart>();
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(S_SURGERY_DATE) IN (" + temp1 + ")";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],ambolatory,dhof,elective,sesia FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + "";

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart pieelement = new PieChart();
                    pieelement.key = oReader2["Title"].ToString().Trim();
                    pieelement.y = oReader2["Quantity"].ToString().Trim();
                    if (surgerydeptType != "0" && surgerydeptType != "")
                    {
                        pieelement.y = surgeryTypesCalculate(oReader2["ambolatory"].ToString(), oReader2["dhof"].ToString(), oReader2["elective"].ToString(), oReader2["sesia"].ToString(), surgerydeptType).ToString();
                    }
                    pieList.Add(pieelement);
                }
                cnn1.Close();
            }
            return pieList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return pieList;
        }
    }
    public List<PieChart> pieChartDialisa(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<PieChart> pieList = new List<PieChart>();
        string period = "";
        string dateSource = "PM_MOVE_DATE";
        if (deptCode == "9")
        {
            dateSource = "a.CreationTime";
        }
        else if (deptCode == "10")
        {
            dateSource = "V.IBGDT";
        }
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(" + dateSource + ") IN (" + temp1 + ")";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();

            string cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode] FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + "";
            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart pieelement = new PieChart();
                    pieelement.key = oReader2["Title"].ToString().Trim();
                    pieelement.y = oReader2["Quantity"].ToString().Trim();
                    pieList.Add(pieelement);
                }
                cnn1.Close();
            }
            return pieList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return pieList;
        }
    }
    public List<PieChart> pieChartER(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<PieChart> pieList = new List<PieChart>();
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(BWIDT) IN (" + temp1 + ")";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode] FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + "";

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart pieelement = new PieChart();
                    pieelement.key = oReader2["Title"].ToString().Trim();
                    pieelement.y = oReader2["Quantity"].ToString().Trim();
                    pieList.Add(pieelement);
                }
                cnn1.Close();
            }
            return pieList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return pieList;
        }
    }
    public List<PieChart> pieChartDelivery(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        //returned here is Premature
        List<PieChart> pieList = new List<PieChart>();
        string returned = "H_DOB";
        if (returnedPatients == "True")
        {
            returned = "[PM_MOVE_DATE]";
        }
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(" + returned + ") IN (" + temp1 + ")";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode] FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients is null";
            if (returnedPatients == "True")
            {
                cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode] FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients = 1";
            }
            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart pieelement = new PieChart();
                    pieelement.key = oReader2["Title"].ToString().Trim();
                    pieelement.y = oReader2["Quantity"].ToString().Trim();
                    pieList.Add(pieelement);
                }
                cnn1.Close();
            }
            return pieList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return pieList;
        }
    }
    public List<PieChart> pieChartRentgenDimot(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<PieChart> pieList = new List<PieChart>();
        string searchTime = "";
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(a.DateDoing) IN (" + temp1 + ")";
        }
        switch (param)
        {
            case "1":
                searchTime = "DATEADD(DAY,-8,GETDATE()) AND FORMAT(a.DateDoing,'yyyy-MM-dd') <> FORMAT(GETDATE(),'yyyy-MM-dd')";
                break;

            case "2":
                int daysInMonth = System.DateTime.DaysInMonth(DateTime.Now.Year, DateTime.Now.Month);
                searchTime = "DATEADD(DAY,-" + daysInMonth.ToString() + ",GETDATE()) AND FORMAT(a.DateDoing,'yyyy-MM-dd') <> FORMAT(GETDATE(),'yyyy-MM-dd')";
                break;

            case "3":
                searchTime = "DATEADD(MONTH,-12,GETDATE())  AND FORMAT(a.DateDoing,'yyyy-MM') <> FORMAT(GETDATE(),'yyyy-MM')";
                break;

            case "4":
                searchTime = "DATEADD(YEAR,-5,GETDATE()) AND MONTH(a.DateDoing) BETWEEN '01' AND MONTH(GETDATE()) - 1";
                break;
            case "5":
                searchTime = "DATEADD(YEAR,-5,GETDATE())  AND YEAR(a.DateDoing) <> YEAR(GETDATE())";
                break;
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode] FROM [NAMER].[dbo].[DW_PieChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + "";
            if (returnedPatients == "True")
            {
                cmdString = "select top 10 c.[Service_Name]as [Title],count(a.CaseNumber) as [Quantity] FROM [NAMER].[dbo].[DimotTechDoing] a WITH(ROWLOCK) inner join [dbo].[DimotTechDoingNamesLog] b on a.DocNumber = b.TechDocNumber INNER JOIN [NAMER].[dbo].[SERVICES_NAME_PARENT_CAT] c WITH(ROWLOCK) ON a.ServiceCode = c.S_ID where a.DateDoing > " + searchTime + period + " and a.DepartDoing = 'דימ-קונ' group by c.[Service_Name] order by count(Distinct(a.CaseNumber)) desc";
            }
            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    PieChart pieelement = new PieChart();
                    pieelement.key = oReader2["Title"].ToString().Trim();
                    pieelement.y = oReader2["Quantity"].ToString().Trim();
                    pieList.Add(pieelement);
                }
                cnn1.Close();
            }
            return pieList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return pieList;
        }
    }
    public List<DiscreteBarChart> discreteBarChartSurgeryStatistics(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList, string graphNumber)
    {
        List<DiscreteBarChart> aggregationList = new List<DiscreteBarChart>();
        string period = "";
        if (periodList != "")
        {
            period = " AND b.[aliasName] IN " + periodList;
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT b.aliasName as Department,SUM(CAST(a.[Q]AS INT)) Quantity,SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] WHERE b.DimTimeTypeID = " + param + period + " and a.departSeode = 0 AND a.DIMDataTypeID = 1 AND a.returnedPatients = " + graphNumber + " GROUP BY b.aliasName, b.[DimTimeTypesDetailID] ORDER BY b.[DimTimeTypesDetailID],SUM(CAST(a.[Q]AS INT)) DESC";
            if (returnedPatients == "True")
            {
                cmdString = "SELECT b.aliasName as Department,SUM(CAST(a.[Q]AS INT)) Quantity,SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] WHERE b.DimTimeTypeID = " + param + period + " and a.departSeode = 1 AND a.DIMDataTypeID = 1 AND a.returnedPatients = " + graphNumber + " GROUP BY b.aliasName, b.[DimTimeTypesDetailID] ORDER BY b.[DimTimeTypesDetailID],SUM(CAST(a.[Q]AS INT)) DESC";
            }

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    DiscreteBarChart aggregationelement = new DiscreteBarChart();
                    aggregationelement.label = oReader2["Department"].ToString();
                    aggregationelement.value = oReader2["Quantity"].ToString();
                    if (surgerydeptType != "0" && surgerydeptType != "")
                    {
                        aggregationelement.value = surgeryTypesCalculate(oReader2["ambolatory"].ToString(), oReader2["dhof"].ToString(), oReader2["elective"].ToString(), oReader2["sesia"].ToString(), surgerydeptType).ToString();
                    }
                    aggregationList.Add(aggregationelement);
                }
                cnn1.Close();
            }
            return aggregationList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return aggregationList;
        }
    }
    public List<object> lineBarChartSurgeryStatistics(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList, string graphNumber)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<LineChart> lineChartList = new List<LineChart>();
        List<string> DepartmentsList = new List<string>();
        List<string> DaysList = new List<string>();
        List<object> twoP = new List<object>();
        List<object> thirdP = new List<object>();
        string period = " AND b.[aliasName] IN " + periodList;

        try
        {
            if (periodList == "")
            {
                period = "";
                cnn1.Open();
                string daysSQLStr = "SELECT [aliasName] FROM [NAMER].[dbo].[DW_DimTimeTypesDetails] WHERE [DimTimeTypeID] = '" + param + "' ORDER BY [DimTimeTypesDetailID]";

                SqlCommand postCmdday = new SqlCommand(daysSQLStr);
                postCmdday.CommandType = System.Data.CommandType.Text;
                postCmdday.Connection = cnn1;

                using (SqlDataReader oReaderday = postCmdday.ExecuteReader())
                {
                    //DaysList.Add("");
                    while (oReaderday.Read())
                    {
                        string day = oReaderday["aliasName"].ToString().Trim();
                        DaysList.Add(day);
                    }
                    cnn1.Close();
                }
                twoP.Add(DaysList);
            }
            string cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDesc as [DIMDataTypeSubDesc],SUM(CAST(a.[Q]AS INT)) Q,SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " and a.departSeode = 0 AND c.DIMDataTypeID = 1 AND a.returnedPatients = " + graphNumber + " GROUP BY b.aliasName,c.DIMDataTypeSubDesc, b.[DimTimeTypesDetailID] ORDER BY b.[DimTimeTypesDetailID],c.DIMDataTypeSubDesc desc--,SUM(CAST(a.[Q]AS INT)) DESC";
            if (returnedPatients == "True")
            {
                cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDescSeode as [DIMDataTypeSubDesc],SUM(CAST(a.[Q]AS INT)) Q,SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " and a.departSeode = 1 AND c.DIMDataTypeID = 1 AND a.returnedPatients = " + graphNumber + " GROUP BY b.aliasName,c.DIMDataTypeSubDescSeode, b.[DimTimeTypesDetailID] ORDER BY b.[DimTimeTypesDetailID],c.DIMDataTypeSubDescSeode desc--,SUM(CAST(a.[Q]AS INT)) DESC";
            }
            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    LineChart lineelement = new LineChart();
                    lineelement.x = oReader3["aliasName"].ToString();
                    if (!DaysList.Contains(lineelement.x) && periodList != "")
                    {
                        DaysList.Add(lineelement.x);
                    }
                    lineelement.depart = oReader3["DIMDataTypeSubDesc"].ToString().Trim();
                    if (!DepartmentsList.Contains(lineelement.depart))
                    {
                        DepartmentsList.Add(lineelement.depart);
                    }
                    lineelement.y = int.Parse(oReader3["Q"].ToString());
                    if (surgerydeptType != "0" && surgerydeptType != "")
                    {
                        lineelement.y = surgeryTypesCalculate(oReader3["ambolatory"].ToString(), oReader3["dhof"].ToString(), oReader3["elective"].ToString(), oReader3["sesia"].ToString(), surgerydeptType);
                    }
                    lineChartList.Add(lineelement);
                }
                if (periodList != "")
                {
                    twoP.Add(DaysList);
                }
                twoP.Add(DepartmentsList);
                cnn1.Close();
            }
            List<List<LineChart>> outside_list = new List<List<LineChart>>();
            List<LineChart> inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);

            for (int i = 1; i < lineChartList.Count; i++)
            {
                int index = 0;//DepartmentsList.FindIndex(a => a.Contains(lineChartList[i - 1].depart));
                for (int j = 1; j < DepartmentsList.Count; j++)
                {
                    if (DepartmentsList[j] == lineChartList[i - 1].depart)
                    {
                        index = j;
                    }
                }
                inside_list[index] = lineChartList[i - 1];
                if (!lineChartList[i].x.Equals(lineChartList[i - 1].x))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
                }
            }
            int index2 = 0;// DepartmentsList.FindIndex(a => a.Contains(lineChartList[lineChartList.Count - 1].depart));
            for (int j = 1; j < DepartmentsList.Count; j++)
            {
                if (DepartmentsList[j] == lineChartList[lineChartList.Count - 1].depart)
                {
                    index2 = j;
                }
            }
            inside_list[index2] = lineChartList[lineChartList.Count - 1];
            outside_list.Add(inside_list);
            inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count - 1]);
            if (outside_list.Count < 5 && param == "4")
            {
                LineChart l = new LineChart();
                l.x = "-4";
                //l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }
            if (param == "5" && periodList == "" && outside_list.Count < 5)
            {
                LineChart l = new LineChart();
                l.x = "-5";
                l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }
            twoP.Add(outside_list);
            return twoP;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return twoP;
        }
    }
    public List<object> lineBarChartEshpozStatistics(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList, string graphNumber)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<LineChart> lineChartList = new List<LineChart>();
        List<string> DepartmentsList = new List<string>();
        List<string> DaysList = new List<string>();
        List<object> twoP = new List<object>();
        List<object> thirdP = new List<object>();
        string period = " AND b.[aliasName] IN " + periodList;

        try
        {
            if (periodList == "")
            {
                period = "";
                cnn1.Open();
                string daysSQLStr = "SELECT [aliasName] FROM [NAMER].[dbo].[DW_DimTimeTypesDetails] WHERE [DimTimeTypeID] = '" + param + "' ORDER BY [DimTimeTypesDetailID]";

                SqlCommand postCmdday = new SqlCommand(daysSQLStr);
                postCmdday.CommandType = System.Data.CommandType.Text;
                postCmdday.Connection = cnn1;

                using (SqlDataReader oReaderday = postCmdday.ExecuteReader())
                {
                    //DaysList.Add("");
                    while (oReaderday.Read())
                    {
                        string day = oReaderday["aliasName"].ToString().Trim();
                        DaysList.Add(day);
                    }
                    cnn1.Close();
                }
                twoP.Add(DaysList);
            }
            string cmdString = "SELECT b.aliasName,a.Department as [DIMDataTypeSubDesc],SUM(CAST(a.[Q]AS INT)) Q, a.[All] FROM[NAMER].[dbo].[DW_WaitingTime_Receipction_FirstDocument] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.[DimTimeTypeID] = b.[DimTimeTypesDetailID] WHERE b.DimTimeTypeID = " + param + period + " and a.DepartSelect = " + surgerydeptType + " and a.GraphNumber = " + graphNumber + " GROUP BY b.aliasName, b.[DimTimeTypesDetailID] ,a.Department, a.[All] ORDER BY b.[DimTimeTypesDetailID] asc,a.Department desc";
            if (returnedPatients == "True")
            {
                cmdString = "SELECT b.aliasName,a.Department as [DIMDataTypeSubDesc],SUM(CAST(a.[Q]AS INT)) Q, a.[All] FROM[NAMER].[dbo].[DW_WaitingTime_Receipction_FirstDocument] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.[DimTimeTypeID] = b.[DimTimeTypesDetailID] WHERE b.DimTimeTypeID = " + param + period + " and a.DepartSelect = " + surgerydeptType + " and a.GraphNumber = " + graphNumber + " GROUP BY b.aliasName, b.[DimTimeTypesDetailID] ,a.Department, a.[All] ORDER BY b.[DimTimeTypesDetailID] asc,a.Department desc";
            }
            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    LineChart lineelement = new LineChart();
                    lineelement.x = oReader3["aliasName"].ToString();
                    if (!DaysList.Contains(lineelement.x) && periodList != "")
                    {
                        DaysList.Add(lineelement.x);
                    }
                    lineelement.depart = oReader3["DIMDataTypeSubDesc"].ToString().Trim();
                    if (!DepartmentsList.Contains(lineelement.depart))
                    {
                        DepartmentsList.Add(lineelement.depart);
                    }
                    lineelement.y = int.Parse(oReader3["Q"].ToString());
                    lineChartList.Add(lineelement);
                }
                if (periodList != "")
                {
                    twoP.Add(DaysList);
                }
                twoP.Add(DepartmentsList);
                cnn1.Close();
            }
            List<List<LineChart>> outside_list = new List<List<LineChart>>();
            List<LineChart> inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);

            for (int i = 1; i < lineChartList.Count; i++)
            {
                int index = 0;//DepartmentsList.FindIndex(a => a.Contains(lineChartList[i - 1].depart));
                for (int j = 1; j < DepartmentsList.Count; j++)
                {
                    if (DepartmentsList[j] == lineChartList[i - 1].depart)
                    {
                        index = j;
                    }
                }
                inside_list[index] = lineChartList[i - 1];
                if (!lineChartList[i].x.Equals(lineChartList[i - 1].x))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
                }
            }
            int index2 = 0;// DepartmentsList.FindIndex(a => a.Contains(lineChartList[lineChartList.Count - 1].depart));
            for (int j = 1; j < DepartmentsList.Count; j++)
            {
                if (DepartmentsList[j] == lineChartList[lineChartList.Count - 1].depart)
                {
                    index2 = j;
                }
            }
            inside_list[index2] = lineChartList[lineChartList.Count - 1];
            outside_list.Add(inside_list);
            inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count - 1]);
            if (outside_list.Count < 5 && param == "4")
            {
                LineChart l = new LineChart();
                l.x = "-4";
                //l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }
            if (param == "5" && periodList == "" && outside_list.Count < 5)
            {
                LineChart l = new LineChart();
                l.x = "-5";
                l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }
            twoP.Add(outside_list);
            return twoP;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return twoP;
        }
    }
    public List<object> lineBarChart(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList, string graphNumber)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<LineChart> lineChartList = new List<LineChart>();
        List<string> DepartmentsList = new List<string>();
        List<string> DaysList = new List<string>();
        List<object> twoP = new List<object>();
        List<object> thirdP = new List<object>();
        string period = " AND b.[aliasName] IN " + periodList;
        string returned = "";

        try
        {
            if (periodList == "")
            {
                period = "";
                cnn1.Open();
                string daysSQLStr = "SELECT [aliasName] FROM [NAMER].[dbo].[DW_DimTimeTypesDetails] WHERE [DimTimeTypeID] = '" + param + "' ORDER BY [DimTimeTypesDetailID]";

                SqlCommand postCmdday = new SqlCommand(daysSQLStr);
                postCmdday.CommandType = System.Data.CommandType.Text;
                postCmdday.Connection = cnn1;

                using (SqlDataReader oReaderday = postCmdday.ExecuteReader())
                {
                    //DaysList.Add("");
                    while (oReaderday.Read())
                    {
                        string day = oReaderday["aliasName"].ToString().Trim();
                        DaysList.Add(day);
                    }
                    cnn1.Close();
                }
                twoP.Add(DaysList);
            }
            if (returnedPatients == "True")
            {
                returned = " and departSeode = 1";
            }
            string cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDesc,a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " AND c.DIMDataTypeID = " + deptCode + returned + "  ORDER BY b.[DimTimeTypesDetailID],a.[Q] DESC";

            if (deptCode == "1")
            {
                cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDesc as [DIMDataTypeSubDesc],SUM(CAST(a.[Q]AS INT)) Q,SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " and a.departSeode = 0 and returnedPatients = 0 AND c.DIMDataTypeID = 1 GROUP BY b.aliasName,c.DIMDataTypeSubDesc, b.[DimTimeTypesDetailID] ORDER BY b.[DimTimeTypesDetailID],SUM(CAST(a.[Q]AS INT)) DESC";
                if (returnedPatients == "True")
                {
                    cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDescSeode as [DIMDataTypeSubDesc],SUM(CAST(a.[Q]AS INT)) Q,SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID  WHERE b.DimTimeTypeID = " + param + period + " and a.departSeode = 1 and a.DIMDataTypeID = 1 and returnedPatients = 0 GROUP BY b.aliasName,c.DIMDataTypeSubDescSeode, b.[DimTimeTypesDetailID] ORDER BY b.[DimTimeTypesDetailID],SUM(CAST(a.[Q]AS INT)) DESC";
                }
            }
            // merpaoot and machoneem
            if (deptCode == "2")
            {
                // if one of the departs
                // in the where ------>  departSeode IN ('0','1') AND c.DIMDataTypeID IN (2) 
                cmdString = "SELECT b.aliasName,case when c.DIMDataTypeSubDesc is null then c.DIMDataTypeSubDescSeode else c.DIMDataTypeSubDesc end as [DIMDataTypeSubDesc],a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " AND a.DIMDataTypeID = 2 AND returnedPatients IN (" + returnedPatients + ") AND [RentgenType] IN (" + surgerydeptType + ") ORDER BY b.[DimTimeTypesDetailID],a.[Q] DESC";
                /*
                // if both departs
                // in the where ------> (departSeode IN ('0','1') AND c.DIMDataTypeID = 2) or (departSeode IN ('1') AND c.DIMDataTypeID = 11) 
                cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDesc,a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " ORDER BY b.[DimTimeTypesDetailID],a.[Q] DESC";*/
            }
            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    LineChart lineelement = new LineChart();
                    lineelement.x = oReader3["aliasName"].ToString();
                    if (!DaysList.Contains(lineelement.x) && periodList != "")
                    {
                        DaysList.Add(lineelement.x);
                    }
                    lineelement.depart = oReader3["DIMDataTypeSubDesc"].ToString().Trim();
                    if (!DepartmentsList.Contains(lineelement.depart))
                    {
                        DepartmentsList.Add(lineelement.depart);
                    }
                    lineelement.y = int.Parse(oReader3["Q"].ToString());
                    if (surgerydeptType != "0" && surgerydeptType != "" && deptCode == "1")
                    {
                        lineelement.y = surgeryTypesCalculate(oReader3["ambolatory"].ToString(), oReader3["dhof"].ToString(), oReader3["elective"].ToString(), oReader3["sesia"].ToString(), surgerydeptType);
                    }
                    lineChartList.Add(lineelement);
                }
                if (periodList != "")
                {
                    twoP.Add(DaysList);
                }
                twoP.Add(DepartmentsList);
                cnn1.Close();
            }
            List<List<LineChart>> outside_list = new List<List<LineChart>>();
            List<LineChart> inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);

            for (int i = 1; i < lineChartList.Count; i++)
            {
                int index = 0;//DepartmentsList.FindIndex(a => a.Contains(lineChartList[i - 1].depart));
                for (int j = 1; j < DepartmentsList.Count; j++)
                {
                    if (DepartmentsList[j] == lineChartList[i - 1].depart)
                    {
                        index = j;
                    }
                }
                inside_list[index] = lineChartList[i - 1];
                if (!lineChartList[i].x.Equals(lineChartList[i - 1].x))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
                }
            }
            int index2 = 0;// DepartmentsList.FindIndex(a => a.Contains(lineChartList[lineChartList.Count - 1].depart));
            for (int j = 1; j < DepartmentsList.Count; j++)
            {
                if (DepartmentsList[j] == lineChartList[lineChartList.Count - 1].depart)
                {
                    index2 = j;
                }
            }
            inside_list[index2] = lineChartList[lineChartList.Count - 1];
            outside_list.Add(inside_list);
            inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count - 1]);
            if (outside_list.Count < 5 && param == "4")
            {
                LineChart l = new LineChart();
                l.x = "-4";
                //l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }
            if (param == "5" && periodList == "" && outside_list.Count < 5)
            {
                LineChart l = new LineChart();
                l.x = "-5";
                l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }
            twoP.Add(outside_list);
            return twoP;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return twoP;
        }
    }
    public List<object> lineBarChartForER(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<LineChart> lineChartList = new List<LineChart>();
        List<string> DepartmentsList = new List<string>();
        List<string> DaysList = new List<string>();
        List<string> TempDaysList = new List<string>();
        List<object> twoP = new List<object>();
        List<object> thirdP = new List<object>();
        string period = "";
        if (periodList != "")
        {
            period = " AND b.[aliasName] IN " + periodList;
        }
        string returned = " AND a.returnedPatients = 0";
        try
        {
            if (period != "")
            {
                for (int i = 0; i < periodList.Length; i++)
                {
                    if (periodList[i] == '-')
                    {
                        TempDaysList.Add(periodList[i] + "" + periodList[i + 1]);
                    }
                }
                twoP.Add(TempDaysList);
            }
            else
            {
                cnn1.Open();
                string daysSQLStr = "SELECT [aliasName] FROM [NAMER].[dbo].[DW_DimTimeTypesDetails] WHERE [DimTimeTypeID] = '" + param + "' ORDER BY [DimTimeTypesDetailID]";
                SqlCommand postCmdday = new SqlCommand(daysSQLStr);
                postCmdday.CommandType = System.Data.CommandType.Text;
                postCmdday.Connection = cnn1;

                using (SqlDataReader oReaderday = postCmdday.ExecuteReader())
                {
                    //DaysList.Add("");
                    while (oReaderday.Read())
                    {
                        string day = oReaderday["aliasName"].ToString().Trim();
                        DaysList.Add(day);
                    }
                    cnn1.Close();
                }
                twoP.Add(DaysList);
            }


            /*cnn1.Open();
            string departmentsSQLStr = "SELECT [DIMDataTypeSubDesc],[DIMDataTypeSubRoom] FROM [NAMER].[dbo].[DW_DataTypesSub] WHERE DIMDataTypeID = 6 and  SubDepartMedical = 1 ORDER BY [DIMDataTypeSubDesc]";
            if(surgerydeptType == "0")
            {
                departmentsSQLStr = "SELECT [DIMDataTypeSubDescSeode]as [DIMDataTypeSubDesc],[DIMDataTypeSubRoomSeode]as [DIMDataTypeSubRoom] FROM [NAMER].[dbo].[DW_DataTypesSub] WHERE DIMDataTypeID = 6 and SubDepartSeode = 1 ORDER BY [DIMDataTypeSubDescSeode]";
            }
            SqlCommand postCmd = new SqlCommand(departmentsSQLStr);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;

            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    string temp = oReader2["DIMDataTypeSubDesc"].ToString().Trim();
                    DepartmentsList.Add(temp);
                }
                cnn1.Close();
            }
            twoP.Add(DepartmentsList);*/
            if (returnedPatients == "True")
            {
                returned = " AND a.returnedPatients = 1";
            }
            string cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDesc,a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " AND c.DIMDataTypeID = 6 AND c.DIMDataTypeSubDesc IS NOT NULL AND a.departSeode = 0" + returned + " ORDER BY b.[DimTimeTypesDetailID]";
            if (surgerydeptType == "0")
            {
                cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDescSeode as [DIMDataTypeSubDesc],a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " AND c.DIMDataTypeID = 6 AND c.DIMDataTypeSubDescSeode IS NOT NULL AND a.departSeode = 1" + returned + " ORDER BY b.[DimTimeTypesDetailID],a.[Q] DESC";
            }
            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    LineChart lineelement = new LineChart();
                    lineelement.x = oReader3["aliasName"].ToString();
                    /*if (!DaysList.Contains(lineelement.x))
                    {
                        DaysList.Add(lineelement.x);
                    }*/
                    lineelement.depart = oReader3["DIMDataTypeSubDesc"].ToString().Trim();
                    if (!DepartmentsList.Contains(lineelement.depart))
                    {
                        DepartmentsList.Add(lineelement.depart);
                    }
                    lineelement.y = int.Parse(oReader3["Q"].ToString());
                    lineChartList.Add(lineelement);
                }
                //twoP.Add(DaysList);
                twoP.Add(DepartmentsList);
                cnn1.Close();
            }
            List<List<LineChart>> outside_list = new List<List<LineChart>>();
            List<LineChart> inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
            for (int i = 1; i < lineChartList.Count; i++)
            {
                int index = DepartmentsList.FindIndex(a => a.Contains(lineChartList[i - 1].depart));
                inside_list[index] = lineChartList[i - 1];
                if (!lineChartList[i].x.Equals(lineChartList[i - 1].x))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
                }
            }
            int index2 = DepartmentsList.FindIndex(a => a.Contains(lineChartList[lineChartList.Count - 1].depart));
            inside_list[index2] = lineChartList[lineChartList.Count - 1];
            outside_list.Add(inside_list);
            inside_list = new List<LineChart>();
            if ((outside_list.Count == 5 && param == "4") || (outside_list.Count == 4 && param == "5" && periodList == ""))
            {
                for (int i = 0; i < DepartmentsList.Count; i++)
                {
                    LineChart l = new LineChart();
                    l.x = "-5";
                    l.depart = "";
                    l.y = 0;
                    inside_list.Add(l);
                }
                outside_list.Add(inside_list);
            }
            twoP.Add(outside_list);
            return twoP;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return twoP;
        }
    }
    public List<object> lineBarChartHospitalDeparts(string param, string deptCode, string surgerydeptType, string filter, string returnedPatients, string periodList)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<LineChart> lineChartList = new List<LineChart>();
        List<string> DepartmentsList = new List<string>();
        List<string> DaysList = new List<string>();
        List<string> TempDaysList = new List<string>();
        List<object> twoP = new List<object>();
        List<object> thirdP = new List<object>();
        string filterVal = filter;
        string returned = " and a.returnedPatients = 0";
        string period = "";
        if (periodList != "")
        {
            period = " AND b.[aliasName] IN " + periodList;
        }
        if (returnedPatients == "True")
        {
            returned = " and a.returnedPatients = 1";
        }
        try
        {
            if (period != "")
            {
                for (int i = 0; i < periodList.Length; i++)
                {
                    if (periodList[i] == '-')
                    {
                        TempDaysList.Add(periodList[i] + "" + periodList[i + 1]);
                    }
                }
                twoP.Add(TempDaysList);
            }
            else
            {
                cnn1.Open();
                string daysSQLStr = "SELECT [aliasName] FROM [NAMER].[dbo].[DW_DimTimeTypesDetails] WHERE [DimTimeTypeID] = '" + param + "' ORDER BY [DimTimeTypesDetailID]";
                SqlCommand postCmdday = new SqlCommand(daysSQLStr);
                postCmdday.CommandType = System.Data.CommandType.Text;
                postCmdday.Connection = cnn1;

                using (SqlDataReader oReaderday = postCmdday.ExecuteReader())
                {
                    //DaysList.Add("");
                    while (oReaderday.Read())
                    {
                        string day = oReaderday["aliasName"].ToString().Trim();
                        DaysList.Add(day);
                    }
                    cnn1.Close();
                }
                twoP.Add(DaysList);
            }

            if (filterVal != "")
            {
                filter = "AND c.DIMDataTypeSubDescSeode = '" + filterVal + "'";
            }
            string cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDescSeode as [DIMDataTypeSubDesc],a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + returned + " AND c.DIMDataTypeID = 5 AND c.DIMDataTypeSubDesc IS NOT NULL AND a.departSeode = 1 " + filter + " ORDER BY b.[DimTimeTypesDetailID],CAST(a.[Q]AS INT) DESC";
            if (surgerydeptType == "1")
            {
                cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDesc,a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + returned + " AND c.DIMDataTypeID = 5 AND c.DIMDataTypeSubDesc IS NOT NULL AND a.departSeode = 0 ORDER BY b.[DimTimeTypesDetailID],CAST(a.[Q]AS INT) DESC";
            }
            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    LineChart lineelement = new LineChart();
                    lineelement.x = oReader3["aliasName"].ToString();
                    /*if (!DaysList.Contains(lineelement.x))
                    {
                        DaysList.Add(lineelement.x);
                    }*/
                    lineelement.depart = oReader3["DIMDataTypeSubDesc"].ToString().Trim();
                    if (!DepartmentsList.Contains(lineelement.depart))
                    {
                        DepartmentsList.Add(lineelement.depart);
                    }
                    lineelement.y = int.Parse(oReader3["Q"].ToString());
                    lineChartList.Add(lineelement);
                }
                //twoP.Add(DaysList);
                twoP.Add(DepartmentsList);
                cnn1.Close();
            }
            List<List<LineChart>> outside_list = new List<List<LineChart>>();
            List<LineChart> inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
            for (int i = 1; i < lineChartList.Count; i++)
            {
                int index = DepartmentsList.FindIndex(a => a.Contains(lineChartList[i - 1].depart));
                inside_list[index] = lineChartList[i - 1];
                if (!lineChartList[i].x.Equals(lineChartList[i - 1].x))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
                }
            }
            int index2 = DepartmentsList.FindIndex(a => a.Contains(lineChartList[lineChartList.Count - 1].depart));
            inside_list[index2] = lineChartList[lineChartList.Count - 1];
            outside_list.Add(inside_list);
            inside_list = new List<LineChart>();
            if ((outside_list.Count == 5 && param == "4") || (outside_list.Count == 4 && param == "5" && periodList == ""))
            {
                for (int i = 0; i < DepartmentsList.Count; i++)
                {
                    LineChart l = new LineChart();
                    l.x = "-5";
                    l.depart = "";
                    l.y = 0;
                    inside_list.Add(l);
                }
                outside_list.Add(inside_list);
            }
            twoP.Add(outside_list);
            return twoP;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return twoP;
        }
    }
    public List<object> lineBarChartReleased(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<LineChart> lineChartList = new List<LineChart>();
        List<string> DepartmentsList = new List<string>();
        List<string> DaysList = new List<string>();
        List<object> twoP = new List<object>();
        List<object> thirdP = new List<object>();
        string period = " AND b.[aliasName] IN " + periodList;
        string searchTime = "";
        string changeRelation = "";
        surgerydeptType = "('" + surgerydeptType + "')";
        try
        {
            if (periodList == "")
            {
                period = "";
                cnn1.Open();
                string daysSQLStr = "SELECT [aliasName] FROM [NAMER].[dbo].[DW_DimTimeTypesDetails] WHERE [DimTimeTypeID] = '" + param + "' ORDER BY [DimTimeTypesDetailID]";

                SqlCommand postCmdday = new SqlCommand(daysSQLStr);
                postCmdday.CommandType = System.Data.CommandType.Text;
                postCmdday.Connection = cnn1;

                using (SqlDataReader oReaderday = postCmdday.ExecuteReader())
                {
                    //DaysList.Add("");
                    while (oReaderday.Read())
                    {
                        string day = oReaderday["aliasName"].ToString().Trim();
                        DaysList.Add(day);
                    }
                    cnn1.Close();
                }
                twoP.Add(DaysList);
            }
            if (surgerydeptType == "('הכל')")
            {
                surgerydeptType = "('ספנ-א','ספנ-ב')";
            }
            // surgerydeptType represinting ספנ-א and ספנ-ב .
            string cmdString = "SELECT [Row_ID],[DimTimeTypeID],[DimTimeTypesDetailID],[aliasName],[Status],[Q],[Department] FROM [NAMER].[dbo].[DW_Malrad_Wait_To_Eshpoz] WHERE [DimTimeTypeID] = " + param + " AND [Department] IN " + surgerydeptType + " AND [TypeOfChart] = 2 order by DimTimeTypesDetailID asc, Status desc";
            if (deptCode == "6")
            {
                cmdString = "SELECT [Row_ID],[DimTimeTypeID],[DimTimeTypesDetailID],[aliasName],[Status],[Q],[Department] FROM [NAMER].[dbo].[DW_Malrad_Wait_To_Eshpoz] WHERE [DimTimeTypeID] = " + param + " AND [Department] IN " + surgerydeptType + " AND [TypeOfChart] = 1 order by DimTimeTypesDetailID asc, Status desc";
            }
            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    LineChart lineelement = new LineChart();
                    lineelement.x = oReader3["aliasName"].ToString();
                    if (!DaysList.Contains(lineelement.x) && periodList != "")
                    {
                        DaysList.Add(lineelement.x);
                    }
                    lineelement.depart = oReader3["Status"].ToString().Trim();
                    if (!DepartmentsList.Contains(lineelement.depart))
                    {
                        DepartmentsList.Add(lineelement.depart);
                    }
                    lineelement.y = int.Parse(oReader3["Q"].ToString());
                    lineChartList.Add(lineelement);
                }
                if (periodList != "")
                {
                    twoP.Add(DaysList);
                }
                twoP.Add(DepartmentsList);
                cnn1.Close();
            }
            List<List<LineChart>> outside_list = new List<List<LineChart>>();
            List<LineChart> inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);

            for (int i = 1; i < lineChartList.Count; i++)
            {
                int index = DepartmentsList.FindIndex(a => a.Contains(lineChartList[i - 1].depart));
                inside_list[index] = lineChartList[i - 1];
                if (!lineChartList[i].x.Equals(lineChartList[i - 1].x))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
                }
            }
            int index2 = DepartmentsList.FindIndex(a => a.Contains(lineChartList[lineChartList.Count - 1].depart));
            inside_list[index2] = lineChartList[lineChartList.Count - 1];
            outside_list.Add(inside_list);
            inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count - 1]);
            /*if (lineChartList.Count == 5 && param == "4")
            {
                LineChart l = new LineChart();
                l.x = "-5";
                l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }*/
            if (param == "5" && periodList == "" && outside_list.Count < 5)
            {
                LineChart l = new LineChart();
                l.x = "-5";
                l.depart = "חדר לידה";
                l.y = 0;
                inside_list.Add(l);
                outside_list.Add(inside_list);
            }
            twoP.Add(outside_list);
            return twoP;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return twoP;
        }
    }
    public List<object> lineBarChartRentgenDimot(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<LineChart> lineChartList = new List<LineChart>();
        List<string> DepartmentsList = new List<string>();
        List<string> DaysList = new List<string>();
        List<object> twoP = new List<object>();
        List<object> thirdP = new List<object>();
        string period = " AND b.[aliasName] IN " + periodList;

        try
        {
            if (periodList == "")
            {
                period = "";
                cnn1.Open();
                string daysSQLStr = "SELECT [aliasName] FROM [NAMER].[dbo].[DW_DimTimeTypesDetails] WHERE [DimTimeTypeID] = '" + param + "' ORDER BY [DimTimeTypesDetailID]";
                SqlCommand postCmdday = new SqlCommand(daysSQLStr);
                postCmdday.CommandType = System.Data.CommandType.Text;
                postCmdday.Connection = cnn1;

                using (SqlDataReader oReaderday = postCmdday.ExecuteReader())
                {
                    while (oReaderday.Read())
                    {
                        string day = oReaderday["aliasName"].ToString().Trim();
                        DaysList.Add(day);
                    }
                    cnn1.Close();
                }
                twoP.Add(DaysList);
            }

            string cmdString = "SELECT b.aliasName,c.DIMDataTypeSubDescSeode as [DIMDataTypeSubDesc],a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.DimTimeTypeID = " + param + period + " AND c.DIMDataTypeID = 3 AND c.DIMDataTypeSubDesc IS NOT NULL AND a.departSeode = 1 ORDER BY b.[DimTimeTypesDetailID],CAST(a.[Q]AS INT) DESC";
            if (returnedPatients == "True")
            {
                cmdString = "SELECT b.aliasName,a.[RentgenType] as [DIMDataTypeSubDesc],a.[Q] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.[DimTimeTypesDetailID] WHERE b.DimTimeTypeID = " + param + period + " AND a.DIMDataTypeID = 3 AND a.departSeode = 0 ORDER BY b.[DimTimeTypesDetailID],CAST(a.[Q]AS INT) DESC";
            }

            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    LineChart lineelement = new LineChart();
                    lineelement.x = oReader3["aliasName"].ToString();
                    if (!DaysList.Contains(lineelement.x) && periodList != "")
                    {
                        DaysList.Add(lineelement.x);
                    }
                    lineelement.depart = oReader3["DIMDataTypeSubDesc"].ToString().Trim();
                    if (!DepartmentsList.Contains(lineelement.depart))
                    {
                        DepartmentsList.Add(lineelement.depart);
                    }
                    lineelement.y = int.Parse(oReader3["Q"].ToString());
                    lineChartList.Add(lineelement);
                }
                if (periodList != "")
                {
                    twoP.Add(DaysList);
                }
                twoP.Add(DepartmentsList);
                cnn1.Close();
            }
            List<List<LineChart>> outside_list = new List<List<LineChart>>();
            List<LineChart> inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
            for (int i = 1; i < lineChartList.Count; i++)
            {
                int index = DepartmentsList.FindIndex(a => a.Contains(lineChartList[i - 1].depart));
                inside_list[index] = lineChartList[i - 1];
                if (!lineChartList[i].x.Equals(lineChartList[i - 1].x))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<LineChart>(new LineChart[DepartmentsList.Count]);
                }
            }
            int index2 = DepartmentsList.FindIndex(a => a.Contains(lineChartList[lineChartList.Count - 1].depart));
            inside_list[index2] = lineChartList[lineChartList.Count - 1];
            outside_list.Add(inside_list);
            inside_list = new List<LineChart>();
            twoP.Add(outside_list);
            return twoP;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return twoP;
        }
    }
    public List<DiscreteBarChart> discreteBarChart(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<DiscreteBarChart> aggregationList = new List<DiscreteBarChart>();
        string surgeryDepartChange = "";
        string returned = "";
        string period = "";
        if (periodList != "")
        {
            period = " AND b.[aliasName] IN " + periodList;
        }
        if (returnedPatients == "True" && deptCode == "7")
        {
            returned = " AND a.DIMDataTypeSubID = 110";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT c.DIMDataTypeSubDesc AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity],SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN [NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + " and a.departSeode = 0 and returnedPatients = 0 AND c.DIMDataTypeID = " + deptCode + returned + " GROUP BY c.DIMDataTypeSubDesc ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            if (deptCode == "7")
            {
                cmdString = "SELECT c.[DIMDataTypeSubDesc] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM[NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + " AND c.DIMDataTypeID = 7 " + returned + " GROUP BY c.[DIMDataTypeSubDesc] ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }
            else if (deptCode == "8" || deptCode == "9" || deptCode == "10" || deptCode == "12")
            {
                cmdString = "SELECT c.[DIMDataTypeSubDesc] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + " AND c.DIMDataTypeID = " + deptCode + " GROUP BY c.DIMDataTypeSubDesc ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }
            else if (deptCode == "1" && returnedPatients == "True")
            {
                cmdString = "SELECT c.DIMDataTypeSubDescSeode AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity],SUM(CAST(a.ambolatory AS INT)) ambolatory ,SUM(CAST(a.dhof AS INT)) dhof ,SUM(CAST(a.elective AS INT)) elective ,SUM(CAST(a.sesia AS INT)) sesia FROM[NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID  WHERE b.[DimTimeTypeID] = " + param + period + " and a.departSeode = 1 and returnedPatients = 0 and a.DIMDataTypeID = 1 GROUP BY c.DIMDataTypeSubDescSeode ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }
            else if (deptCode == "2")
            {
                cmdString = "SELECT CASE WHEN c.DIMDataTypeSubDesc is null THEN c.DIMDataTypeSubDescSeode WHEN c.DIMDataTypeSubDescSeode is null THEN c.DIMDataTypeSubDesc END AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN [NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + " and returnedPatients IN (" + returnedPatients + ") and [RentgenType] IN (" + surgerydeptType + ") AND a.DIMDataTypeID = 2 GROUP BY c.DIMDataTypeSubDescSeode,c.DIMDataTypeSubDesc ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }
            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    DiscreteBarChart aggregationelement = new DiscreteBarChart();
                    aggregationelement.label = oReader2["Department"].ToString();
                    aggregationelement.value = oReader2["Quantity"].ToString();
                    if (surgerydeptType != "0" && surgerydeptType != "" && deptCode == "1")
                    {
                        aggregationelement.value = surgeryTypesCalculate(oReader2["ambolatory"].ToString(), oReader2["dhof"].ToString(), oReader2["elective"].ToString(), oReader2["sesia"].ToString(), surgerydeptType).ToString();
                    }
                    aggregationList.Add(aggregationelement);
                }
                cnn1.Close();
            }
            return aggregationList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return aggregationList;
        }
    }
    public List<DiscreteBarChart> discreteBarChartForER(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<DiscreteBarChart> aggregationList = new List<DiscreteBarChart>();
        string returned = " and a.returnedPatients = 0";
        try
        {
            string cmdString = "";
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string period = "";
            if (periodList != "")
            {
                period = " AND b.[aliasName] IN " + periodList;
            }
            if (returnedPatients == "True")
            {
                returned = " and a.returnedPatients = 1";
            }
            if (surgerydeptType == "1")
            {
                cmdString = "SELECT c.[DIMDataTypeSubDesc] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + " AND c.DIMDataTypeID = " + deptCode + " and a.departSeode = 0 " + returned + " GROUP BY c.[DIMDataTypeSubDesc] ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }
            else
            {
                cmdString = "SELECT c.[DIMDataTypeSubDescSeode] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + " AND c.DIMDataTypeID = " + deptCode + " and a.departSeode = 1 " + returned + " GROUP BY c.[DIMDataTypeSubDescSeode] ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    DiscreteBarChart aggregationelement = new DiscreteBarChart();
                    aggregationelement.label = oReader2["Department"].ToString();
                    aggregationelement.value = oReader2["Quantity"].ToString();
                    aggregationList.Add(aggregationelement);
                }
                cnn1.Close();
            }
            return aggregationList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return aggregationList;
        }
    }
    public List<DiscreteBarChart> discreteBarChartHospitalDeparts(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<DiscreteBarChart> aggregationList = new List<DiscreteBarChart>();
        try
        {
            string returned = " and [returnedPatients] = 0";
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            if (returnedPatients == "True")
            {
                returned = " and [returnedPatients] = 1";
            }
            string period = "";
            if (periodList != "")
            {
                period = " AND b.[aliasName] IN " + periodList;
            }
            string cmdString = "SELECT c.[DIMDataTypeSubDesc] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN[NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + returned + " AND c.DIMDataTypeID = " + deptCode + " and a.departSeode = 0 GROUP BY c.[DIMDataTypeSubDesc]  ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            if (surgerydeptType == "0")
            {
                cmdString = "SELECT c.[DIMDataTypeSubDescSeode] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + returned + " AND c.DIMDataTypeID = " + deptCode + " and a.departSeode = 1 GROUP BY c.[DIMDataTypeSubDescSeode] ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    DiscreteBarChart aggregationelement = new DiscreteBarChart();
                    aggregationelement.label = oReader2["Department"].ToString();
                    aggregationelement.value = oReader2["Quantity"].ToString();
                    aggregationList.Add(aggregationelement);
                }
                cnn1.Close();
            }
            return aggregationList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return aggregationList;
        }
    }
    public List<DiscreteBarChart> discreteBarChartRentgenDimot(string param, string deptCode, string surgerydeptType, string returnedPatients, string periodList)
    {
        List<DiscreteBarChart> aggregationList = new List<DiscreteBarChart>();
        string period = "";
        if (periodList != "")
        {
            period = " AND b.[aliasName] IN " + periodList;
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT c.[DIMDataTypeSubDesc] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN [NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] c ON a.DIMDataTypeSubID = c.DIMDataTypeSubID WHERE b.[DimTimeTypeID] = " + param + period + " AND a.departSeode = 1 AND c.DIMDataTypeID = " + deptCode + " GROUP BY c.[DIMDataTypeSubDesc] ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            if (returnedPatients == "True")
            {
                cmdString = "SELECT a.[RentgenType] AS [Department],SUM(CAST(a.[Q] AS INT))AS [Quantity] FROM [NAMER].[dbo].[DW_Aggregation] a INNER JOIN[NAMER].[dbo].[DW_DimTimeTypesDetails] b ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID WHERE b.[DimTimeTypeID] = " + param + period + " AND departSeode = 0 AND a.DIMDataTypeID = 3 GROUP BY a.[RentgenType] ORDER BY SUM(CAST(a.[Q] AS INT)) DESC";
            }
            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    DiscreteBarChart aggregationelement = new DiscreteBarChart();
                    aggregationelement.label = oReader2["Department"].ToString();
                    aggregationelement.value = oReader2["Quantity"].ToString();
                    aggregationList.Add(aggregationelement);
                }
                cnn1.Close();
            }
            return aggregationList;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return aggregationList;
        }
    }
    public List<object> stackedBarChart(string param, string deptCode, string surgerydeptType, string chooseType, string returnedPatients, string periodList)
    {
        List<object> groupedBar = new List<object>();
        try
        {
            string changeTime = "";
            string period = "";
            string shift = " between '07:00:00' and '14:59:00' then 'בוקר' WHEN a.[PM_MOVE_TIME] between '15:00:00' and '23:59:00' then 'ערב' else 'לילה'";
            if (periodList != "")
            {
                string temp1 = "";
                var year = DateTime.Now.Year.ToString();
                for (int i = 0; i < periodList.Length; i++)
                {
                    if (periodList[i] == '-')
                    {
                        var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                        temp1 += temp + ",";
                    }
                }
                temp1 = temp1.Substring(0, temp1.Length - 1);
                period = " AND YEAR(a." + changeTime + ") IN (" + temp1 + ")";
            }
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            if (deptCode == "8")
            {
                shift = " between '06:30:00' and '14:30:00' then 'בוקר' WHEN a.[PM_MOVE_TIME] between '14:30:00'  and '22:00:00' then 'ערב' else 'לילה'";
            }
            // all departments except under
            string cmdString = "SELECT [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] where DepartCode = " + deptCode + " and TimeLapse = " + param + "";
            // only delivery department
            if (deptCode == "7")
            {
                // all new borns and new borns that under 1750 gram
                cmdString = "SELECT [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] where DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients IS NULL";
                // only new borns bellow 1750 gram
                if (returnedPatients == "True")
                {
                    cmdString = "SELECT [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] where DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients = 1";
                }
            }
            // only the surgery department
            else if (deptCode == "1")
            {
                // by shift
                cmdString = "SELECT [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode],ambolatory,dhof,elective,sesia FROM [NAMER].[dbo].[DW_GroupedChart] where DepartCode = " + deptCode + " and seode = 1 and TimeLapse = " + param + " and returnedPatients = " + chooseType + " ORDER BY 2 DESC, 1 ASC";
                //by area
                if (returnedPatients == "True")
                {
                    cmdString = "SELECT b.[DIMDataTypeSubDescSeode] AS [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode],ambolatory,dhof,elective,sesia FROM [NAMER].[dbo].[DW_GroupedChart] a INNER JOIN [NAMER].[dbo].[DW_DataTypesSub] b ON a.Title = b.DIMDataTypeSubRoomSeode where DepartCode = " + deptCode + " and seode = 0 and TimeLapse = " + param + " and returnedPatients = " + chooseType + " ORDER BY 2 DESC, 1 ASC";
                }
            }
            else if (deptCode == "9")
            {
                cmdString = "SELECT [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] where DepartCode = " + deptCode + " and TimeLapse = " + param + "";
            }
            else if (deptCode == "10")
            {
                cmdString = "SELECT [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] where DepartCode = " + deptCode + " and TimeLapse = " + param + "";
            }
            else if (deptCode == "2")
            {
                cmdString = "SELECT [Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] where DepartCode = 2 and TimeLapse = " + param + " and [returnedPatients] IN (" + returnedPatients + ") and [PatientType] IN (" + surgerydeptType + ")";
            }

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            StackedBarChart2 stacked_element = new StackedBarChart2();
            List<StackedBarChart2> element_list = new List<StackedBarChart2>();
            List<string> depart_List = new List<string>();
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    stacked_element = new StackedBarChart2();
                    stacked_element.key = oReader2["Title_two"].ToString().Trim();
                    stacked_element.x = oReader2["Title"].ToString().Trim();
                    stacked_element.y = int.Parse(oReader2["Quantity"].ToString());
                    if (surgerydeptType != "0" && surgerydeptType != "" && deptCode == "1")
                    {
                        stacked_element.y = surgeryTypesCalculate(oReader2["ambolatory"].ToString(), oReader2["dhof"].ToString(), oReader2["elective"].ToString(), oReader2["sesia"].ToString(), surgerydeptType);
                    }
                    if (!depart_List.Contains(stacked_element.x))
                    {
                        depart_List.Add(oReader2["Title"].ToString().Trim());
                    }
                    element_list.Add(stacked_element);
                }
                cnn1.Close();
            }
            List<List<StackedBarChart2>> outside_list = new List<List<StackedBarChart2>>();
            List<StackedBarChart2> inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
            for (int i = 1; i < element_list.Count; i++)
            {
                int index = depart_List.FindIndex(a => a.Contains(element_list[i - 1].x));
                inside_list[index] = element_list[i - 1];
                if (!element_list[i].key.Equals(element_list[i - 1].key))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
                }
            }
            int index2 = depart_List.FindIndex(a => a.Contains(element_list[element_list.Count - 1].x));
            inside_list[index2] = element_list[element_list.Count - 1];
            outside_list.Add(inside_list);
            groupedBar.Add(outside_list);
            groupedBar.Add(depart_List);
            return groupedBar;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return groupedBar;
        }
    }
    public List<object> stackedBarChartForER(string param, string deptCode, string surgerydeptType, string chooseType, string returnedPatients, string periodList)
    {
        List<object> groupedBar = new List<object>();
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(a.PM_MOVE_DATE) IN (" + temp1 + ")";
        }
        if (returnedPatients == "True")
        {
            returnedPatients = "1";
        }
        else
        {
            returnedPatients = "0";
        }
        if (surgerydeptType == "True")
        {
            surgerydeptType = "1";
        }
        else
        {
            surgerydeptType = "0";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients = " + returnedPatients + " and seode = " + surgerydeptType + "";

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            StackedBarChart2 stacked_element = new StackedBarChart2();
            List<StackedBarChart2> element_list = new List<StackedBarChart2>();
            List<string> depart_List = new List<string>();
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    stacked_element = new StackedBarChart2();
                    stacked_element.key = oReader2["Title_two"].ToString().Trim();
                    stacked_element.x = oReader2["Title"].ToString().Trim();
                    stacked_element.y = int.Parse(oReader2["Quantity"].ToString());
                    if (!depart_List.Contains(stacked_element.x))
                    {
                        depart_List.Add(oReader2["Title"].ToString().Trim());
                    }
                    element_list.Add(stacked_element);
                }
                cnn1.Close();
            }
            List<List<StackedBarChart2>> outside_list = new List<List<StackedBarChart2>>();
            List<StackedBarChart2> inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
            for (int i = 1; i < element_list.Count; i++)
            {
                int index = depart_List.FindIndex(a => a.Contains(element_list[i - 1].x));
                inside_list[index] = element_list[i - 1];
                if (!element_list[i].key.Equals(element_list[i - 1].key))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
                }
            }
            int index2 = depart_List.FindIndex(a => a.Contains(element_list[element_list.Count - 1].x));
            inside_list[index2] = element_list[element_list.Count - 1];
            outside_list.Add(inside_list);
            groupedBar.Add(outside_list);
            groupedBar.Add(depart_List);
            return groupedBar;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return groupedBar;
        }
    }
    public List<object> stackedBarChartForHospitalDeparts(string param, string deptCode, string deptType, string chooseType, string returnedPatients, string periodList)
    {
        List<object> groupedBar = new List<object>();
        try
        {
            string period = "";
            if (periodList != "")
            {
                string temp1 = "";
                var year = DateTime.Now.Year.ToString();
                for (int i = 0; i < periodList.Length; i++)
                {
                    if (periodList[i] == '-')
                    {
                        var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                        temp1 += temp + ",";
                    }
                }
                temp1 = temp1.Substring(0, temp1.Length - 1);
                period = " AND YEAR(a.PM_MOVE_DATE) IN (" + temp1 + ")";
            }
            if (returnedPatients == "True")
            {
                returnedPatients = "1";
            }
            else
            {
                returnedPatients = "0";
            }
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients = " + returnedPatients + " and seode = 1";

            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            StackedBarChart2 stacked_element = new StackedBarChart2();
            List<StackedBarChart2> element_list = new List<StackedBarChart2>();
            List<string> depart_List = new List<string>();
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    stacked_element = new StackedBarChart2();
                    stacked_element.key = oReader2["Title_two"].ToString().Trim();
                    stacked_element.x = oReader2["Title"].ToString().Trim();
                    stacked_element.y = int.Parse(oReader2["Quantity"].ToString());
                    if (!depart_List.Contains(stacked_element.x))
                    {
                        depart_List.Add(oReader2["Title"].ToString().Trim());
                    }
                    element_list.Add(stacked_element);
                }
                cnn1.Close();
            }
            List<List<StackedBarChart2>> outside_list = new List<List<StackedBarChart2>>();
            List<StackedBarChart2> inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
            for (int i = 1; i < element_list.Count; i++)
            {
                int index = depart_List.FindIndex(a => a.Contains(element_list[i - 1].x));
                inside_list[index] = element_list[i - 1];
                if (!element_list[i].key.Equals(element_list[i - 1].key))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
                }
            }
            int index2 = depart_List.FindIndex(a => a.Contains(element_list[element_list.Count - 1].x));
            inside_list[index2] = element_list[element_list.Count - 1];
            outside_list.Add(inside_list);
            groupedBar.Add(outside_list);
            groupedBar.Add(depart_List);
            return groupedBar;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return groupedBar;
        }
    }
    public List<object> stackedBarChartRentgenDimot(string param, string deptCode, string deptType, string chooseType, string returnedPatients, string periodList)
    {
        List<object> groupedBar = new List<object>();
        string period = "";
        if (periodList != "")
        {
            string temp1 = "";
            var year = DateTime.Now.Year.ToString();
            for (int i = 0; i < periodList.Length; i++)
            {
                if (periodList[i] == '-')
                {
                    var temp = Int32.Parse(year) + Int32.Parse(periodList[i] + "" + periodList[i + 1]);
                    temp1 += temp + ",";
                }
            }
            temp1 = temp1.Substring(0, temp1.Length - 1);
            period = " AND YEAR(a.DateDoing) IN (" + temp1 + ")";
        }
        if (returnedPatients == "True")
        {
            returnedPatients = " = 1";
        }
        else
        {
            returnedPatients = "IS NULL";
        }
        try
        {
            SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
            cnn1.Open();
            string cmdString = "SELECT [Row_ID],[Title],[Title_two],[Quantity],[ChartType],[Status],[TimeLapse],[DepartCode],[returnedPatients],[seode] FROM [NAMER].[dbo].[DW_GroupedChart] WHERE DepartCode = " + deptCode + " and TimeLapse = " + param + " and returnedPatients " + returnedPatients + "";


            SqlCommand postCmd = new SqlCommand(cmdString);
            postCmd.CommandType = System.Data.CommandType.Text;
            postCmd.Connection = cnn1;
            StackedBarChart2 stacked_element = new StackedBarChart2();
            List<StackedBarChart2> element_list = new List<StackedBarChart2>();
            List<string> depart_List = new List<string>();
            using (SqlDataReader oReader2 = postCmd.ExecuteReader())
            {
                while (oReader2.Read())
                {
                    stacked_element = new StackedBarChart2();
                    stacked_element.key = oReader2["Title_two"].ToString().Trim();
                    stacked_element.x = oReader2["Title"].ToString().Trim();
                    stacked_element.y = int.Parse(oReader2["Quantity"].ToString());
                    if (!depart_List.Contains(stacked_element.x))
                    {
                        depart_List.Add(oReader2["Title"].ToString().Trim());
                    }
                    element_list.Add(stacked_element);
                }
                cnn1.Close();
            }
            List<List<StackedBarChart2>> outside_list = new List<List<StackedBarChart2>>();
            List<StackedBarChart2> inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
            for (int i = 1; i < element_list.Count; i++)
            {
                int index = depart_List.FindIndex(a => a.Contains(element_list[i - 1].x));
                inside_list[index] = element_list[i - 1];
                if (!element_list[i].key.Equals(element_list[i - 1].key))
                {
                    outside_list.Add(inside_list);
                    inside_list = new List<StackedBarChart2>(new StackedBarChart2[depart_List.Count]);
                }
            }
            int index2 = depart_List.FindIndex(a => a.Contains(element_list[element_list.Count - 1].x));
            inside_list[index2] = element_list[element_list.Count - 1];
            outside_list.Add(inside_list);
            groupedBar.Add(outside_list);
            groupedBar.Add(depart_List);
            return groupedBar;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return groupedBar;
        }
    }

    public List<TableView> getTableViewForHospitalDashboard(string param, string deptCode)
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<TableView> table_list = new List<TableView>();
        try
        {
            string cmdString = "SELECT [AggregationID],[DIMDataTypeID],[DIMDataTypeSubID],[DimTimeTypesDetailID],[DepartmentDesc],[Q],[Actions],[doctorDesc]as UserName,concat( b.[UserFirstName],', ', b.[UserLastName])as Test,[NewPatientsQ] FROM [NAMER].[dbo].[DW_AggregationTableView] a left join[NAMER].[dbo].[NAMER_USERS] b on a.UserName = b.UserName WHERE[DIMDataTypeID] = " + deptCode + " AND [DimTimeTypesDetailID] = " + param + " AND a.UserName <> 'SAPSCHED' order by 5 asc, cast([Q] as int) desc";
            if (deptCode == "1")
            {
                cmdString = "SELECT [AggregationID],[DIMDataTypeID],[DIMDataTypeSubID],[DimTimeTypesDetailID],[DepartmentDesc],[Q],[Actions],[doctorDesc]as UserName,concat( b.[UserFirstName],', ', b.[UserLastName])as Test,[NewPatientsQ] FROM [NAMER].[dbo].[DW_AggregationTableView] a left join[NAMER].[dbo].[NAMER_USERS] b on a.UserName = b.UserName WHERE[DIMDataTypeID] = " + deptCode + " AND [DimTimeTypesDetailID] = " + param + " order by 5 asc, cast([Q] as int) desc";
            }
            cnn1.Open();
            SqlCommand postCmd2 = new SqlCommand(cmdString);
            postCmd2.CommandType = System.Data.CommandType.Text;
            postCmd2.Connection = cnn1;
            using (SqlDataReader oReader3 = postCmd2.ExecuteReader())
            {
                while (oReader3.Read())
                {
                    TableView table = new TableView();
                    table.DoctorName = oReader3["UserName"].ToString().Trim();
                    table.DepartmentName = oReader3["DepartmentDesc"].ToString().Trim();
                    table.Q = int.Parse(oReader3["Q"].ToString().Trim());
                    table.Actions = int.Parse(oReader3["Actions"].ToString().Trim());
                    table_list.Add(table);
                }
                cnn1.Close();
            }
            return table_list;
        }
        catch (System.Exception e)
        {
            Console.WriteLine("An error has occured. \n:" + e.Message);
            return table_list;
        }
    }
    private int surgeryTypesCalculate(string ambolatory, string dhof, string elective, string sesia, string types)
    {
        int calc = 0;
        if (sesia == "")
        {
            sesia = "0";
        }
        if (types.Contains("אמבולטורי"))
        {
            calc += int.Parse(ambolatory);
        }
        if (types.Contains("דחוף"))
        {
            calc += int.Parse(dhof);
        }
        if (types.Contains("אלקטיב"))
        {
            calc += int.Parse(elective);
        }
        if (types.Contains("ססיה"))
        {
            calc += int.Parse(sesia);
        }
        /*if (types.Contains("ססיה אלק"))
        {
            calc += int.Parse(sesia_elective);
        }*/
        return calc;
    }

    public List<object> _IncomeDataByYear()
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<object> twoP = new List<object>();
        List<string> YearsList = new List<string>();
        List<object> YearlyDataList = new List<object>();

        try
        {
            cnn1.Open();

            string cmdString = @"
            SELECT 
                year,
                month,
                MonthlySummarizedValue
            FROM CH_Income
            ORDER BY year, month
        ";

            SqlCommand cmd = new SqlCommand(cmdString, cnn1);
            cmd.CommandType = System.Data.CommandType.Text;

            using (SqlDataReader oReader = cmd.ExecuteReader())
            {
                int? currentYear = null;
                List<MonthData> months = null; // Using a helper class for months

                while (oReader.Read())
                {
                    int year = Convert.ToInt32(oReader["year"]);
                    int monthNumber = Convert.ToInt32(oReader["month"]);
                    decimal monthlyValue = Convert.ToDecimal(oReader["MonthlySummarizedValue"]);

                    if (currentYear == null || year != currentYear)
                    {
                        if (months != null)
                        {
                            // Before adding, sort months by correct order
                            months.Sort((a, b) => a.MonthNumber.CompareTo(b.MonthNumber));

                            // Add year
                            YearlyDataList.Add(new
                            {
                                Year = new
                                {
                                    value = currentYear,
                                    Months = months.ConvertAll(m => new { name = TranslateMonthNumberToHebrew(m.MonthNumber), y = m.Value })
                                }
                            });
                        }

                        months = new List<MonthData>();
                        currentYear = year;
                        YearsList.Add(year.ToString());
                    }

                    months.Add(new MonthData
                    {
                        MonthNumber = monthNumber,
                        Value = monthlyValue
                    });
                }

                // Add the last year if exists
                if (months != null)
                {
                    months.Sort((a, b) => a.MonthNumber.CompareTo(b.MonthNumber));
                    YearlyDataList.Add(new
                    {
                        Year = new
                        {
                            value = currentYear,
                            Months = months.ConvertAll(m => new { name = TranslateMonthNumberToHebrew(m.MonthNumber), y = m.Value })
                        }
                    });
                }
            }

            cnn1.Close();

            // Safety: if no data, return empty structures
            if (YearsList.Count == 0)
                YearsList.Add("");

            if (YearlyDataList.Count == 0)
                YearlyDataList.Add(new { Year = new { value = 0, Months = new List<object>() } });

            twoP.Add(YearsList);
            twoP.Add(YearlyDataList);

            return twoP;
        }
        catch (Exception e)
        {
            Console.WriteLine("Error in IncomeDataByYear: " + e.Message);

            // Always return a valid twoP
            twoP.Add(new List<string> { "" });
            twoP.Add(new List<object> { new { Year = new { value = 0, Months = new List<object>() } } });
            return twoP;
        }
    }

    public List<object> __IncomeDataByYear()
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<object> twoP = new List<object>();

        try
        {
            cnn1.Open();

            string cmdString = @"
            SELECT 
                year,
                month,
                MonthlySummarizedValue
            FROM CH_Income
            ORDER BY year, month
        ";

            SqlCommand cmd = new SqlCommand(cmdString, cnn1);
            cmd.CommandType = System.Data.CommandType.Text;

            // Dictionary<month, Dictionary<year, value>>
            Dictionary<int, Dictionary<int, decimal>> data = new Dictionary<int, Dictionary<int, decimal>>();
            HashSet<int> yearsSet = new HashSet<int>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int year = Convert.ToInt32(reader["year"]);
                    int month = Convert.ToInt32(reader["month"]);
                    decimal value = reader["MonthlySummarizedValue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["MonthlySummarizedValue"]);

                    if (!data.ContainsKey(month))
                        data[month] = new Dictionary<int, decimal>();

                    data[month][year] = value;
                    yearsSet.Add(year);
                }
            }

            cnn1.Close();

            // Sort years ascending
            var sortedYears = yearsSet.OrderBy(y => y).ToList();
            var yearsListStrings = sortedYears.ConvertAll(y => y.ToString());

            // Header row: ["חודש", "2022", "2023", ...]
            List<object> header = new List<object> { "חודש" };
            header.AddRange(sortedYears.ConvertAll(y => (object)y.ToString()));
            List<object> chartData = new List<object> { header };

            // Fill rows for each Hebrew month
            for (int month = 1; month <= 12; month++)
            {
                List<object> row = new List<object> { TranslateMonthNumberToHebrew(month) };

                foreach (int year in sortedYears)
                {
                    if (data.ContainsKey(month) && data[month].ContainsKey(year))
                        row.Add(data[month][year]);
                    else
                        row.Add(0); // Default to 0 if missing
                }

                chartData.Add(row);
            }

            // Add results to the final return structure
            twoP.Add(yearsListStrings); // ["2022", "2023", ...]
            twoP.Add(chartData);        // [["חודש", ...], ["ינואר", ...], ...]

            return twoP;
        }
        catch (Exception e)
        {
            Console.WriteLine("Error in IncomeTDataByYear: " + e.Message);

            // Return fallback structure
            twoP.Add(new List<string> { "" });
            twoP.Add(new List<object> { new List<object> { "חודש" } });
            return twoP;
        }
    }

    public object IncomeDataByYear()
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<object> structuredData = new List<object>();

        try
        {
            cnn1.Open();

            string cmdString = @"
            SELECT 
                year,
                month,
                MonthlySummarizedValue
            FROM CH_Income
            ORDER BY year, month
        ";

            SqlCommand cmd = new SqlCommand(cmdString, cnn1);
            cmd.CommandType = System.Data.CommandType.Text;

            // Dictionary<year, Dictionary<month, value>>
            Dictionary<int, Dictionary<int, decimal>> yearMonthData = new Dictionary<int, Dictionary<int, decimal>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int year = Convert.ToInt32(reader["year"]);
                    int month = Convert.ToInt32(reader["month"]);
                    decimal value = reader["MonthlySummarizedValue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["MonthlySummarizedValue"]);

                    if (!yearMonthData.ContainsKey(year))
                        yearMonthData[year] = new Dictionary<int, decimal>();

                    yearMonthData[year][month] = value;
                }
            }

            cnn1.Close();

            // Hebrew month lookup
            string[] hebrewMonths = new string[] {
            "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
            "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
        };

            List<object> yData = new List<object>();

            foreach (var yearEntry in yearMonthData.OrderBy(e => e.Key))
            {
                int year = yearEntry.Key;
                var monthsData = yearEntry.Value;

                var monthList = new List<Dictionary<string, object>>();

                for (int m = 1; m <= 12; m++)
                {
                    monthList.Add(new Dictionary<string, object>
                {
                    { "name", hebrewMonths[m - 1] },
                    { "y", monthsData.ContainsKey(m) ? monthsData[m] : 0 }
                });
                }

                yData.Add(new Dictionary<string, object>
            {
                { "Year", new Dictionary<string, object>
                    {
                        { "value", year },
                        { "Months", monthList }
                    }
                }
            });
            }

            return new Dictionary<string, object>
        {
            { "yData", yData }
        };
        }
        catch (Exception e)
        {
            Console.WriteLine("Error in IncomeTDataByYearStructured: " + e.Message);
            return new { yData = new List<object>() };
        }
    }


    public object IncomeTDataByYear()
    {
        SqlConnection cnn1 = new SqlConnection(connetionStringNAMER);
        List<object> structuredData = new List<object>();

        try
        {
            cnn1.Open();

            string cmdString = @"
            SELECT 
                year,
                month,
                MonthlySummarizedValue
            FROM CH_Income
            ORDER BY year, month
        ";

            SqlCommand cmd = new SqlCommand(cmdString, cnn1);
            cmd.CommandType = System.Data.CommandType.Text;

            // Dictionary<year, Dictionary<month, value>>
            Dictionary<int, Dictionary<int, decimal>> yearMonthData = new Dictionary<int, Dictionary<int, decimal>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int year = Convert.ToInt32(reader["year"]);
                    int month = Convert.ToInt32(reader["month"]);
                    decimal value = reader["MonthlySummarizedValue"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["MonthlySummarizedValue"]);

                    if (!yearMonthData.ContainsKey(year))
                        yearMonthData[year] = new Dictionary<int, decimal>();

                    yearMonthData[year][month] = value;
                }
            }

            cnn1.Close();

            // Hebrew month lookup
            string[] hebrewMonths = new string[] {
            "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
            "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
        };

            List<object> yData = new List<object>();

            foreach (var yearEntry in yearMonthData.OrderBy(e => e.Key))
            {
                int year = yearEntry.Key;
                var monthsData = yearEntry.Value;

                var monthList = new List<Dictionary<string, object>>();

                for (int m = 1; m <= 12; m++)
                {
                    monthList.Add(new Dictionary<string, object>
                {
                    { "name", hebrewMonths[m - 1] },
                    { "y", monthsData.ContainsKey(m) ? monthsData[m] : 0 }
                });
                }

                yData.Add(new Dictionary<string, object>
            {
                { "Year", new Dictionary<string, object>
                    {
                        { "value", year },
                        { "Months", monthList }
                    }
                }
            });
            }

            return new Dictionary<string, object>
        {
            { "yData", yData }
        };
        }
        catch (Exception e)
        {
            Console.WriteLine("Error in IncomeTDataByYearStructured: " + e.Message);
            return new { yData = new List<object>() };
        }
    }

    public string ProceduresDataByYear(int lastMonthsCount = 0, bool onlyLastMonth = false)
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);
        List<MonthDataExtended> allMonths = new List<MonthDataExtended>();
        List<object> YearlyDataList = new List<object>();

        try
        {
            cnn.Open();

            string query = @"
            SELECT 
                year,
                month,
                MonthlySummarizedValue
            FROM CH_ProceduresC
            ORDER BY year ASC, month ASC
        ";

            SqlCommand cmd = new SqlCommand(query, cnn);
            cmd.CommandType = System.Data.CommandType.Text;

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    allMonths.Add(new MonthDataExtended
                    {
                        Year = Convert.ToInt32(reader["year"]),
                        MonthNumber = Convert.ToInt32(reader["month"]),
                        Value = Convert.ToDecimal(reader["MonthlySummarizedValue"])
                    });
                }
            }

            cnn.Close();

            if (onlyLastMonth)
            {
                // Return only the very latest month globally
                var latestMonth = allMonths.OrderBy(m => m.Year).ThenBy(m => m.MonthNumber).LastOrDefault();

                if (latestMonth != null)
                {
                    YearlyDataList.Add(new
                    {
                        Year = new
                        {
                            value = latestMonth.Year,
                            Months = new List<object>
                        {
                            new {
                                name = TranslateMonthNumberToHebrew(latestMonth.MonthNumber),
                                y = latestMonth.Value
                            }
                        }
                        }
                    });
                }
            }
            else
            {
                // Calculate last N months from today
                var today = DateTime.Today;
                List<int> validMonths = new List<int>();
                int monthCursor = today.Month;

                for (int i = 0; i < lastMonthsCount; i++)
                {
                    validMonths.Add(monthCursor);
                    monthCursor--;
                    if (monthCursor == 0)
                        monthCursor = 12;
                }

                validMonths.Sort(); // Sort months ascending for display

                // Group by Year
                var yearsGroup = allMonths
                    .GroupBy(m => m.Year)
                    .OrderBy(g => g.Key);

                foreach (var yearGroup in yearsGroup)
                {
                    var months = yearGroup
                        .Where(m => validMonths.Contains(m.MonthNumber))
                        .OrderBy(m => m.MonthNumber)
                        .ToList();

                    if (months.Count > 0)
                    {
                        YearlyDataList.Add(new
                        {
                            Year = new
                            {
                                value = yearGroup.Key,
                                Months = months.ConvertAll(m => new
                                {
                                    name = TranslateMonthNumberToHebrew(m.MonthNumber),
                                    y = m.Value
                                })
                            }
                        });
                    }
                }
            }

            if (YearlyDataList.Count == 0)
            {
                YearlyDataList.Add(new { Year = new { value = 0, Months = new List<object>() } });
            }

            string jsonResult = JsonConvert.SerializeObject(new
            {
                yData = YearlyDataList
            });

            return jsonResult;
        }
        catch (Exception e)
        {
            Console.WriteLine("Error in ProceduresDataByYear: " + e.Message);

            string emptyJson = JsonConvert.SerializeObject(new
            {
                yData = new List<object> { new { Year = new { value = 0, Months = new List<object>() } } }
            });

            return emptyJson;
        }
    }

    public string Exploitation()
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);
        var result = new
        {
            cols = new List<object>
            {
                new { id = "A", label = "Year", type = "string" },
                new { id = "B", label = "בוקר", type = "number" },
                new { id = "C", label = "ססיות", type = "number" },
                new { id = "D", label = "דחופים, לילה, סופ׳ש", type = "number" }
            },
            rows = new List<object>()
        };

        try
        {
            cnn.Open();

            string query = @"
                SELECT 
                    year,
                    [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                    SUM(MonthlySummarizedValue) AS TotalValue
                FROM CH_ProceduresbyType
                GROUP BY year, [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
                ORDER BY year
            ";

            SqlCommand cmd = new SqlCommand(query, cnn);

            Dictionary<int, Dictionary<string, decimal>> data = new Dictionary<int, Dictionary<string, decimal>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int year = Convert.ToInt32(reader["year"]);
                    string surgeryType = reader["SurgeryType"].ToString();
                    decimal value = Convert.ToDecimal(reader["TotalValue"]);

                    if (!data.ContainsKey(year))
                        data[year] = new Dictionary<string, decimal>();

                    data[year][surgeryType] = value;
                }
            }

            foreach (var yearEntry in data.OrderBy(d => d.Key))
            {
                var year = yearEntry.Key;
                var surgeryTypes = yearEntry.Value;

                result.rows.Add(new
                {
                    c = new List<object>
                    {
                        new { v = year },
                        new { v = surgeryTypes.ContainsKey("אלקטיבי") ? surgeryTypes["אלקטיבי"] : 0 },
                        new { v = surgeryTypes.ContainsKey("ססיה") ? surgeryTypes["ססיה"] : 0 },
                        new { v = surgeryTypes.ContainsKey("דחוף") ? surgeryTypes["דחוף"] : 0 }
                    }
                });
            }

            cnn.Close();

            return JsonConvert.SerializeObject(result, Formatting.Indented);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error in GetProceduresSummary: " + ex.Message);
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }
    public DataTable ExploitationTimeAvgTable(string groupBy)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            cnn.Open();

            string query;

            if (groupBy == "monthly")
            {
                // Monthly aggregation
                query = @"
                SELECT 
                    year,
                    month,
                    [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                    AVG(AvgMinutes) AS AvgValue
                FROM CH_ProceduresAvgTime
                GROUP BY year, month, [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
                ORDER BY year, month
            ";
            }
            else if (groupBy == "yearly")
            {
                // Yearly aggregation via monthly averages
                query = @"
                WITH MonthlyAverages AS (
                    SELECT 
                        year,
                        month,
                        [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                        AVG(AvgMinutes) AS MonthlyAvgMinutes
                    FROM CH_ProceduresAvgTime
                    GROUP BY year, month, [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
                )
                SELECT 
                    year,
                    SurgeryType,
                    AVG(MonthlyAvgMinutes) AS AvgValue
                FROM MonthlyAverages
                GROUP BY year, SurgeryType
                ORDER BY year
            ";
            }
            else
            {
                throw new ArgumentException("Invalid groupBy value. Expected 'monthly' or 'yearly'.");
            }

            SqlCommand cmd = new SqlCommand(query, cnn);
            SqlDataAdapter adapter = new SqlDataAdapter(cmd);
            DataTable dt = new DataTable();
            adapter.Fill(dt);

            return dt;
        }
    }

    public string ExploitationTimeAvgJson(string groupBy)
    {
        DataTable dt = ExploitationTimeAvgTable(groupBy);

        var cols = new List<object>();
        cols.Add(new { id = "", label = groupBy == "monthly" ? "חודש" : "שנה", type = "string" });
        cols.Add(new { id = "", label = "אלקטיבי", type = "number" });
        cols.Add(new { id = "", label = "דחוף", type = "number" });
        cols.Add(new { id = "", label = "ססיה", type = "number" });

        var rows = new List<object>();

        Dictionary<string, Dictionary<string, decimal>> groupedData = new Dictionary<string, Dictionary<string, decimal>>();

        foreach (DataRow row in dt.Rows)
        {
            int year = Convert.ToInt32(row["year"]);
            string periodLabel = year.ToString();

            if (groupBy == "monthly" && dt.Columns.Contains("month"))
            {
                int month = Convert.ToInt32(row["month"]);
                string monthName = TranslateMonthNumberToHebrew(month);
                periodLabel = monthName + " " + year.ToString();
            }

            string surgeryType = row["SurgeryType"].ToString();
            decimal avgValue = Convert.ToDecimal(row["AvgValue"]);

            if (!groupedData.ContainsKey(periodLabel))
                groupedData.Add(periodLabel, new Dictionary<string, decimal>());

            groupedData[periodLabel][surgeryType] = avgValue;
        }

        foreach (var periodEntry in groupedData.OrderBy(x => x.Key))
        {
            string period = periodEntry.Key;
            Dictionary<string, decimal> surgeryTypes = periodEntry.Value;

            rows.Add(new
            {
                c = new List<object>
            {
                new { v = period },
                new { v = surgeryTypes.ContainsKey("אלקטיבי") ? (decimal?)surgeryTypes["אלקטיבי"] : null },
                new { v = surgeryTypes.ContainsKey("דחוף") ? (decimal?)surgeryTypes["דחוף"] : null },
                new { v = surgeryTypes.ContainsKey("ססיה") ? (decimal?)surgeryTypes["ססיה"] : null }
            }
            });
        }

        var result = new
        {
            cols = cols,
            rows = rows
        };

        return JsonConvert.SerializeObject(result, Formatting.Indented);
    }


    // Helper small class to hold month info
    private class MonthData
    {
        public int MonthNumber { get; set; }
        public decimal Value { get; set; }
    }

    // Translate month numbers to Hebrew
    private string TranslateMonthNumberToHebrew(int monthNumber)
    {
        var months = new Dictionary<int, string>
    {
        {1, "ינואר"},
        {2, "פברואר"},
        {3, "מרץ"},
        {4, "אפריל"},
        {5, "מאי"},
        {6, "יוני"},
        {7, "יולי"},
        {8, "אוגוסט"},
        {9, "ספטמבר"},
        {10, "אוקטובר"},
        {11, "נובמבר"},
        {12, "דצמבר"}
    };

        return months.ContainsKey(monthNumber) ? months[monthNumber] : monthNumber.ToString();
    }

    public string GetMonthWorkingDaysInfo(int year, int month)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
            SELECT 
                Year,
                Month,
                WorkingDays
            FROM CH_WorkingDaysIsrael
            WHERE Year = @year AND Month = @month
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);
                cmd.Parameters.AddWithValue("@year", year);
                cmd.Parameters.AddWithValue("@month", month);

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        var result = new
                        {
                            Month = Convert.ToInt32(reader["Month"]),
                            WorkingDays = Convert.ToInt32(reader["WorkingDays"])
                        };

                        return JsonConvert.SerializeObject(result);
                    }
                    else
                    {
                        // No data found, return default object
                        var emptyResult = new { Month = month, WorkingDays = 0 };
                        return JsonConvert.SerializeObject(emptyResult);
                    }
                }
            }
            catch (Exception e)
            {
                Console.WriteLine("Error in GetMonthWorkingDaysInfo: " + e.Message);
                var errorResult = new { Month = month, WorkingDays = 0 };
                return JsonConvert.SerializeObject(errorResult);
            }
        }
    }


    public string GetDepartmentList()
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT DIMDataTypeID, DIMDataTypeDesc
                FROM DW_DIMDataTypes
                ORDER BY DIMDataTypeID
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                var departments = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        departments.Add(new
                        {
                            id = Convert.ToInt32(reader["DIMDataTypeID"]),
                            name = reader["DIMDataTypeDesc"].ToString()
                        });
                    }
                }

                return JsonConvert.SerializeObject(departments);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetDepartmentList: " + ex.Message);
                return JsonConvert.SerializeObject(new List<object>());
            }
        }
    }

    public class ChartDataPoint
    {
        public string Label { get; set; }
        public double Value { get; set; }
    }


    public string GetRevenueOverTime(DateTime? startDate = null, DateTime? endDate = null, string granularity = "day")
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();
                var data = new List<ChartDataPoint>();

                string groupByExpr;
                string orderByExpr;

                switch (granularity.ToLower())
                {
                    case "week":
                        groupByExpr = "DATEADD(WEEK, DATEDIFF(WEEK, 0, [תאריך חשבונית]), 0)";
                        orderByExpr = groupByExpr;
                        break;
                    case "month":
                        groupByExpr = "DATEFROMPARTS(YEAR([תאריך חשבונית]), MONTH([תאריך חשבונית]), 1)";
                        orderByExpr = groupByExpr;
                        break;
                    case "quarter":
                        groupByExpr = "DATEFROMPARTS(YEAR([תאריך חשבונית]), ((DATEPART(QUARTER, [תאריך חשבונית]) - 1) * 3) + 1, 1)";
                        orderByExpr = groupByExpr;
                        break;
                    case "year":
                        groupByExpr = "DATEFROMPARTS(YEAR([תאריך חשבונית]), 1, 1)";
                        orderByExpr = groupByExpr;
                        break;
                    default:
                        groupByExpr = "CAST([תאריך חשבונית] AS DATE)";
                        orderByExpr = groupByExpr;
                        break;
                }

                string query = string.Format(@"
                SELECT {0} AS GroupDate, SUM(הכנסה) AS TotalRevenue
                FROM VW_RoeiAggregationInvoice
                WHERE (@startDate IS NULL OR [תאריך חשבונית] >= @startDate)
                  AND (@endDate IS NULL OR [תאריך חשבונית] <= @endDate)
                GROUP BY {0}
                ORDER BY {1}", groupByExpr, orderByExpr);

                SqlCommand cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@startDate", (object)startDate ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@endDate", (object)endDate ?? DBNull.Value);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        DateTime groupDate = reader.IsDBNull(0) ? DateTime.MinValue : (DateTime)reader[0];
                        double value = reader.IsDBNull(1) ? 0.0 : Convert.ToDouble(reader[1]);

                        // Build range label
                        string label;
                        switch (granularity.ToLower())
                        {
                            case "week":
                                label = groupDate.ToString("MMM dd, yyyy") + " - " + groupDate.AddDays(6).ToString("MMM dd, yyyy");
                                break;
                            case "month":
                                var monthEnd = groupDate.AddMonths(1).AddDays(-1);
                                label = groupDate.ToString("MMM dd, yyyy") + " - " + monthEnd.ToString("MMM dd, yyyy");
                                break;
                            case "quarter":
                                var quarterEnd = groupDate.AddMonths(3).AddDays(-1);
                                label = groupDate.ToString("MMM dd, yyyy") + " - " + quarterEnd.ToString("MMM dd, yyyy");
                                break;
                            case "year":
                                var yearEnd = new DateTime(groupDate.Year, 12, 31);
                                label = groupDate.ToString("yyyy") + " (" + groupDate.ToString("MMM dd") + " - " + yearEnd.ToString("MMM dd") + ")";
                                break;
                            default:
                                label = groupDate.ToString("yyyy-MM-dd");
                                break;
                        }

                        data.Add(new ChartDataPoint
                        {
                            Label = label,
                            Value = value
                        });
                    }
                }

                return JsonConvert.SerializeObject(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetRevenueOverTime: " + ex.Message);
                return JsonConvert.SerializeObject(new List<ChartDataPoint>());
            }
        }
    }

    public string GetRevenueByFund()
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();
                var data = new List<ChartDataPoint>();
                string query = "SELECT [קרן/מדינה], SUM(הכנסה) FROM VW_RoeiAggregationInvoice GROUP BY [קרן/מדינה]";
                SqlCommand cmd = new SqlCommand(query, conn);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string label = reader.IsDBNull(0) ? "לא ידוע" : reader[0].ToString();
                        double value = reader.IsDBNull(1) ? 0.0 : Convert.ToDouble(reader[1]);

                        data.Add(new ChartDataPoint { Label = label, Value = value });
                    }
                }

                return JsonConvert.SerializeObject(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetRevenueByFund: " + ex.Message);
                return JsonConvert.SerializeObject(new List<ChartDataPoint>());
            }
        }
    }


    public string GetRevenueByFundEx(DateTime? startDate = null, DateTime? endDate = null, string timePeriod = "last12months")
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();

                var result = new Dictionary<string, List<ChartDataPoint>>();

                DateTime today = DateTime.Today;

                // If start/end not provided explicitly, use timePeriod
                if (!startDate.HasValue || !endDate.HasValue)
                {
                    timePeriod = (timePeriod ?? "last12months").ToLower();
                    endDate = today;

                    if (timePeriod == "last30days")
                        startDate = today.AddDays(-30);
                    else if (timePeriod == "thisyear")
                        startDate = new DateTime(today.Year, 1, 1);
                    else if (timePeriod == "lastyear")
                        startDate = new DateTime(today.Year - 1, 1, 1);
                    else if (timePeriod == "lastquarter")
                        startDate = today.AddMonths(-3);
                    else if (timePeriod == "last2years")
                        startDate = today.AddYears(-2);
                    else if (timePeriod == "last3years")
                        startDate = today.AddYears(-3);
                    else if (timePeriod == "last4years")
                        startDate = today.AddYears(-4);
                    else if (timePeriod == "last5years")
                        startDate = today.AddYears(-5);
                    else
                        startDate = today.AddMonths(-12); // default
                }

                string dateColumn = "[תאריך חשבונית]";
                string groupColumn = "FORMAT(" + dateColumn + ", 'yyyy-MM')";

                string query =
                    "SELECT [קרן/מדינה], " + groupColumn + " AS GroupedDate, SUM(הכנסה) AS TotalRevenue " +
                    "FROM VW_RoeiAggregationInvoice " +
                    "WHERE " + dateColumn + " >= @startDate AND " + dateColumn + " <= @endDate " +
                    "GROUP BY [קרן/מדינה], " + groupColumn + " " +
                    "ORDER BY [קרן/מדינה], GroupedDate";

                SqlCommand cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@startDate", startDate.Value);
                cmd.Parameters.AddWithValue("@endDate", endDate.Value);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string fund = reader.IsDBNull(0) ? "לא ידוע" : reader[0].ToString();
                        string period = reader.IsDBNull(1) ? "" : reader[1].ToString();
                        double value = reader.IsDBNull(2) ? 0.0 : Convert.ToDouble(reader[2]);

                        if (!result.ContainsKey(fund))
                        {
                            result[fund] = new List<ChartDataPoint>();
                        }

                        result[fund].Add(new ChartDataPoint
                        {
                            Label = period,
                            Value = value
                        });
                    }
                }

                var output = new List<object>();
                foreach (var kvp in result)
                {
                    output.Add(new
                    {
                        label = kvp.Key,
                        series = kvp.Value
                    });
                }

                return JsonConvert.SerializeObject(output);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetRevenueByFundEx: " + ex.Message);
                return JsonConvert.SerializeObject(new List<object>());
            }
        }
    }


    public string GetRevenueByFundGrouped(DateTime? startDate = null, DateTime? endDate = null, string granularity = "month")
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();

                var result = new Dictionary<string, List<ChartDataPoint>>();

                string dateColumn = "[תאריך חשבונית]";
                string groupColumn;

                var g = granularity != null ? granularity.ToLower() : "month";
                if (g == "day")
                    groupColumn = "FORMAT(" + dateColumn + ", 'yyyy-MM-dd')";
                else if (g == "month")
                    groupColumn = "FORMAT(" + dateColumn + ", 'yyyy-MM')";
                else if (g == "quarter")
                    groupColumn = "CAST(YEAR(" + dateColumn + ") AS VARCHAR) + '-Q' + CAST(DATEPART(QUARTER, " + dateColumn + ") AS VARCHAR)";
                else if (g == "year")
                    groupColumn = "FORMAT(" + dateColumn + ", 'yyyy')";
                else
                    groupColumn = "FORMAT(" + dateColumn + ", 'yyyy-MM')";

                string query =
                    "SELECT [קרן/מדינה], " + groupColumn + " AS GroupedDate, SUM(הכנסה) AS TotalRevenue " +
                    "FROM VW_RoeiAggregationInvoice " +
                    "WHERE (@startDate IS NULL OR " + dateColumn + " >= @startDate) " +
                    "AND (@endDate IS NULL OR " + dateColumn + " <= @endDate) " +
                    "GROUP BY [קרן/מדינה], " + groupColumn + " " +
                    "ORDER BY [קרן/מדינה], GroupedDate";

                SqlCommand cmd = new SqlCommand(query, conn);
                cmd.Parameters.AddWithValue("@startDate", startDate.HasValue ? (object)startDate.Value : DBNull.Value);
                cmd.Parameters.AddWithValue("@endDate", endDate.HasValue ? (object)endDate.Value : DBNull.Value);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string fund = reader.IsDBNull(0) ? "לא ידוע" : reader[0].ToString();
                        string period = reader.IsDBNull(1) ? "" : reader[1].ToString();
                        double value = reader.IsDBNull(2) ? 0.0 : Convert.ToDouble(reader[2]);

                        if (!result.ContainsKey(fund))
                        {
                            result[fund] = new List<ChartDataPoint>();
                        }

                        result[fund].Add(new ChartDataPoint
                        {
                            Label = period,
                            Value = value
                        });
                    }
                }

                // Convert dictionary to list of series
                var output = new List<object>();
                foreach (var kvp in result)
                {
                    output.Add(new
                    {
                        label = kvp.Key,
                        series = kvp.Value
                    });
                }

                return JsonConvert.SerializeObject(output);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetRevenueByFundGrouped: " + ex.Message);
                return JsonConvert.SerializeObject(new List<object>());
            }
        }
    }

    public string GetRevenueByCase()
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();
                var data = new List<ChartDataPoint>();
                string query = "SELECT [מספר מקרה], SUM(הכנסה) FROM VW_RAgonInvoice GROUP BY [מספר מקרה]";
                SqlCommand cmd = new SqlCommand(query, conn);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string label = reader.IsDBNull(0) ? "לא ידוע" : reader[0].ToString();
                        double value = reader.IsDBNull(1) ? 0.0 : Convert.ToDouble(reader[1]);

                        data.Add(new ChartDataPoint { Label = label, Value = value });
                    }
                }

                return JsonConvert.SerializeObject(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetRevenueByCase: " + ex.Message);
                return JsonConvert.SerializeObject(new List<ChartDataPoint>());
            }
        }
    }

    public string GetChargeCodeCounts()
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();
                var data = new List<ChartDataPoint>();
                string query = "SELECT [כמות קודי חיוב], COUNT(*) FROM VW_RoeiAggregationInvoice GROUP BY [כמות קודי חיוב]";
                SqlCommand cmd = new SqlCommand(query, conn);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string label = reader.IsDBNull(0) ? "לא ידוע" : reader[0].ToString();
                        double value = reader.IsDBNull(1) ? 0.0 : Convert.ToDouble(reader[1]);

                        data.Add(new ChartDataPoint { Label = label, Value = value });
                    }
                }

                return JsonConvert.SerializeObject(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetChargeCodeCounts: " + ex.Message);
                return JsonConvert.SerializeObject(new List<ChartDataPoint>());
            }
        }
    }

    public string GetCanceledRatio()
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();
                var data = new List<ChartDataPoint>();
                string query = @"
                SELECT 
                    CASE WHEN [CanceledInvoice] IS NULL OR [CanceledInvoice] = '' THEN 'Active' ELSE 'Canceled' END AS Status,
                    COUNT(*) 
                FROM VW_RoeiAggregationInvoice
                GROUP BY CASE WHEN [CanceledInvoice] IS NULL OR [CanceledInvoice] = '' THEN 'Active' ELSE 'Canceled' END";
                SqlCommand cmd = new SqlCommand(query, conn);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string label = reader.IsDBNull(0) ? "לא ידוע" : reader[0].ToString();
                        double value = reader.IsDBNull(1) ? 0.0 : Convert.ToDouble(reader[1]);

                        data.Add(new ChartDataPoint { Label = label, Value = value });
                    }
                }

                return JsonConvert.SerializeObject(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetCanceledRatio: " + ex.Message);
                return JsonConvert.SerializeObject(new List<ChartDataPoint>());
            }
        }
    }

    public string GetRevenueByPayer()
    {
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                conn.Open();
                var data = new List<ChartDataPoint>();
                string query = "SELECT [משלם], SUM(הכנסה) FROM VW_RoeiAggregationInvoice GROUP BY [משלם]";
                SqlCommand cmd = new SqlCommand(query, conn);

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string label = reader.IsDBNull(0) ? "לא ידוע" : reader[0].ToString();
                        double value = reader.IsDBNull(1) ? 0.0 : Convert.ToDouble(reader[1]);

                        data.Add(new ChartDataPoint { Label = label, Value = value });
                    }
                }

                return JsonConvert.SerializeObject(data);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetRevenueByPayer: " + ex.Message);
                return JsonConvert.SerializeObject(new List<ChartDataPoint>());
            }
        }
    }

    public List<string> GetAvailableDepts()
    {
        var depts = new List<string>();

        const string query = @"
        SELECT DISTINCT LTRIM(RTRIM([מחלקה מחייבת])) AS DeptName
        FROM VW_RoeiAggregationInvoice
        WHERE [מחלקה מחייבת] IS NOT NULL AND LTRIM(RTRIM([מחלקה מחייבת])) <> ''
        ORDER BY DeptName";

        try
        {
            using (var conn = new SqlConnection(connetionStringNAMER))
            using (var cmd = new SqlCommand(query, conn))
            {
                conn.Open();

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string deptName = reader.GetString(0);

                        if (!string.IsNullOrWhiteSpace(deptName))
                        {
                            depts.Add(deptName);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error in GetAvailableDepts: " + ex.Message);
        }

        return depts;
    }

    public List<string> GetAvailableDeptsEx()
    {
        var depts = new List<string>();

        const string query = @"
        SELECT DISTINCT LTRIM(RTRIM([מחלקה מחייבת])) AS DeptName
        FROM VW_RoeiAggregationInvoice
        WHERE [מחלקה מחייבת] IS NOT NULL AND LTRIM(RTRIM([מחלקה מחייבת])) <> ''
        ORDER BY DeptName";

        try
        {
            using (var conn = new SqlConnection(connetionStringNAMER))
            using (var cmd = new SqlCommand(query, conn))
            {
                conn.Open();

                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string deptName = reader.GetString(0);

                        if (!string.IsNullOrWhiteSpace(deptName))
                        {
                            depts.Add(deptName);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error in GetAvailableDepts: " + ex.Message);
        }

        return depts;
    }


    public string GetRevenueOverTimeWChargingDept(string startDate, string endDate, string deptGroupId, string granularity)
    {
        DateTime? start = string.IsNullOrEmpty(startDate) ? (DateTime?)null : DateTime.Parse(startDate);
        DateTime? end = string.IsNullOrEmpty(endDate) ? (DateTime?)null : DateTime.Parse(endDate);

        int? deptGroupIdValue = null;
        if (!string.IsNullOrEmpty(deptGroupId))
        {
            int parsed;
            if (int.TryParse(deptGroupId, out parsed))
            {
                deptGroupIdValue = parsed;
            }
        }

        // Grouping
        string groupByExpr, orderByExpr;
        string g = (granularity != null) ? granularity.ToLower() : "";

        if (g == "week")
        {
            groupByExpr = "DATEADD(WEEK, DATEDIFF(WEEK, 0, v.[תאריך חשבונית]), 0)";
        }
        else if (g == "month")
        {
            groupByExpr = "DATEFROMPARTS(YEAR(v.[תאריך חשבונית]), MONTH(v.[תאריך חשבונית]), 1)";
        }
        else if (g == "quarter")
        {
            groupByExpr = "DATEFROMPARTS(YEAR(v.[תאריך חשבונית]), ((DATEPART(QUARTER, v.[תאריך חשבונית]) - 1) * 3) + 1, 1)";
        }
        else if (g == "year")
        {
            groupByExpr = "DATEFROMPARTS(YEAR(v.[תאריך חשבונית]), 1, 1)";
        }
        else
        {
            groupByExpr = "CAST(v.[תאריך חשבונית] AS DATE)";
        }

        orderByExpr = groupByExpr;

        // Final query → per GROUP
        string query = string.Format(@"
SELECT {0} AS GroupDate,
       SUM(v.הכנסה) AS TotalRevenue,
       g.DeptGroupId,
       g.DeptGroupName
FROM VW_RoeiAggregationInvoice v
LEFT JOIN dbo.CH_DeptGroups g
    ON LTRIM(RTRIM(ISNULL(v.[מחלקה מחייבת], ''))) = g.DeptName
WHERE (@startDate IS NULL OR v.[תאריך חשבונית] >= @startDate)
  AND (@endDate IS NULL OR v.[תאריך חשבונית] <= @endDate)
  AND g.DeptGroupId IS NOT NULL
  AND (@DeptGroupId IS NULL OR g.DeptGroupId = @DeptGroupId)
GROUP BY {0}, g.DeptGroupId, g.DeptGroupName
ORDER BY {1}, g.DeptGroupId
",
        groupByExpr,
        orderByExpr
        );

        // Execute
        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            conn.Open();

            SqlCommand cmd = new SqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@startDate", (object)start ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@endDate", (object)end ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@DeptGroupId", (object)deptGroupIdValue ?? DBNull.Value);

            var data = new List<object>();

            using (var reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    DateTime groupDate = reader.IsDBNull(0) ? DateTime.MinValue : reader.GetDateTime(0);
                    double value = reader.IsDBNull(1) ? 0.0 : Convert.ToDouble(reader.GetDecimal(1));
                    int deptGroupIdResult = reader.IsDBNull(2) ? 0 : reader.GetInt32(2);
                    string deptGroupNameResult = reader.IsDBNull(3) ? "" : reader.GetString(3);

                    // Label
                    string label;
                    if (g == "week")
                    {
                        label = groupDate.ToString("MMM dd, yyyy") + " - " + groupDate.AddDays(6).ToString("MMM dd, yyyy");
                    }
                    else if (g == "month")
                    {
                        DateTime monthEnd = groupDate.AddMonths(1).AddDays(-1);
                        label = groupDate.ToString("MMM dd, yyyy") + " - " + monthEnd.ToString("MMM dd, yyyy");
                    }
                    else if (g == "quarter")
                    {
                        DateTime quarterEnd = groupDate.AddMonths(3).AddDays(-1);
                        label = groupDate.ToString("MMM dd, yyyy") + " - " + quarterEnd.ToString("MMM dd, yyyy");
                    }
                    else if (g == "year")
                    {
                        DateTime yearEnd = new DateTime(groupDate.Year, 12, 31);
                        label = groupDate.ToString("yyyy") + " (" + groupDate.ToString("MMM dd") + " - " + yearEnd.ToString("MMM dd") + ")";
                    }
                    else
                    {
                        label = groupDate.ToString("yyyy-MM-dd");
                    }

                    data.Add(new
                    {
                        Label = label,
                        Value = value,
                        DeptGroupId = deptGroupIdResult,
                        DeptGroupName = deptGroupNameResult
                    });
                }

            }

            return JsonConvert.SerializeObject(data);
        }
    }



    public string GetDepartmentListEx()
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT Id, Name
                FROM dbo.CH_DeptGroupList
                ORDER BY Id
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                var departments = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        departments.Add(new
                        {
                            id = Convert.ToInt32(reader["Id"]),
                            name = reader["Name"].ToString()
                        });
                    }
                }

                return JsonConvert.SerializeObject(departments);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetDepartmentListEx: " + ex.Message);
                return JsonConvert.SerializeObject(new List<object>());
            }
        }
    }

    //


    public string GetPicDetailedData()
    {
        DateTime today = DateTime.Today;
        DateTime startOfPreviousMonth = new DateTime(today.Year, today.Month, 1).AddMonths(-1);
        DateTime endDate = today;

        string query = @"
		 SELECT 
		p.SF_CASE,
		PatientNumber,
		p.SF_DATE, 
		p.SF_TEROOM, 
		p.SF_TIME, 
		p.RoomNumber,
		p.SF_ENDCUT, 
		p.SF_EXROOM, 
		p.DocName,
		s.SurgeryID,
		s.SurgeryCode,
		s.SurgeryName
	FROM dbo.PCI p WITH (NOLOCK)
	LEFT JOIN [NAMER].[dbo].[SurgeriesRealTime] s WITH (NOLOCK)
		ON p.SF_CASE = s.CaseNumber
	WHERE 
		p.SF_DATE >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()) - 1, 0)  
		AND p.SF_DATE <= EOMONTH(GETDATE())                                 
	ORDER BY p.SF_DATE
	";

        var cols = new List<Dictionary<string, object>>
    {
        new Dictionary<string, object> { { "id", "sf_case" }, { "label", "מקרה" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "patientnumber" }, { "label", "מספר מטופל" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "sf_date" }, { "label", "תאריך" }, { "type", "date" } },
        new Dictionary<string, object> { { "id", "sf_teroom" }, { "label", "שעת התחלה" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "sf_time" }, { "label", "שעת סיום" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "room_number" }, { "label", "מספר חדר" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "sf_endcut" }, { "label", "סיום חתך" }, { "type", "date" } },
        new Dictionary<string, object> { { "id", "sf_exroom" }, { "label", "שעת יציאה" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "doc_name" }, { "label", "שם רופא" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "surgeryid" }, { "label", "מספר פרוצדורה" }, { "type", "string" } },
        new Dictionary<string, object> { { "id", "surgeryname" }, { "label", "שם פרוצדורה" }, { "type", "string" } }
    };

        var rows = new List<Dictionary<string, object>>();

        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            conn.Open();
            using (SqlCommand cmd = new SqlCommand(query, conn))
            {
                cmd.Parameters.AddWithValue("@startDate", startOfPreviousMonth);
                cmd.Parameters.AddWithValue("@endDate", endDate);

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var cells = new List<Dictionary<string, object>>
                    {
                        Cell(reader, "SF_CASE"),
                        Cell(reader, "PatientNumber"),
                        DateCell(reader, "SF_DATE"),
                        Cell(reader, "SF_TEROOM"),
                        Cell(reader, "SF_TIME"),
                        Cell(reader, "RoomNumber"),
                        Cell(reader, "SF_ENDCUT"),
                        Cell(reader, "SF_EXROOM"),
                        Cell(reader, "DocName"),
                        Cell(reader, "SurgeryID"),
                        Cell(reader, "SurgeryName")
                    };

                        rows.Add(new Dictionary<string, object> { { "c", cells } });
                    }
                }
            }
        }

        var dataTable = new Dictionary<string, object>
    {
        { "cols", cols },
        { "rows", rows }
    };

        return JsonConvert.SerializeObject(dataTable);
    }


    private Dictionary<string, object> Cell(SqlDataReader reader, string columnName)
    {
        object val = reader[columnName];
        return new Dictionary<string, object> { { "v", val != DBNull.Value ? val.ToString() : null } };
    }

    private Dictionary<string, object> DateCell(SqlDataReader reader, string columnName)
    {
        object val = reader[columnName];
        if (val == DBNull.Value)
            return new Dictionary<string, object> { { "v", null } };

        DateTime dt = Convert.ToDateTime(val);
        // Google DataTable accepts ISO 8601 string which Angular will turn into JS Date
        return new Dictionary<string, object> { { "v", dt.ToString("yyyy-MM-ddTHH:mm:ss") } };
    }

    private string SafeGetString(SqlDataReader reader, string columnName)
    {
        return reader[columnName] != DBNull.Value ? reader[columnName].ToString() : null;
    }

    public string ExploitationMonthly()
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);

        var result = new
        {
            cols = new List<object>
        {
            new { id = "month", label = "חודש", type = "string" },
            new { id = "elective", label = "בוקר", type = "number" },
            new { id = "session", label = "ססיות", type = "number" },
            new { id = "urgent", label = "דחופים, לילה, סופ׳ש", type = "number" }
        },
            rows = new List<object>()
        };

        try
        {
            cnn.Open();

            // Get start date = first day of the month, 36 months ago (excluding current month)
            DateTime today = DateTime.Today;
            DateTime endMonth = new DateTime(today.Year, today.Month, 1).AddDays(-1); // Last day of previous month
            DateTime startMonth = endMonth.AddMonths(-35); // 36 total full months

            int startYear = startMonth.Year;
            int startMonthNum = startMonth.Month;
            int endYear = endMonth.Year;
            int endMonthNum = endMonth.Month;

            string query = @"
            SELECT 
                [year],
                [month],
                [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                SUM(MonthlySummarizedValue) AS TotalValue
            FROM CH_ProceduresbyType
            WHERE 
                ([year] > @startYear OR ([year] = @startYear AND [month] >= @startMonth))
                AND
                ([year] < @endYear OR ([year] = @endYear AND [month] <= @endMonth))
            GROUP BY [year], [month], [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
            ORDER BY [year], [month]
        ";

            SqlCommand cmd = new SqlCommand(query, cnn);
            cmd.Parameters.AddWithValue("@startYear", startYear);
            cmd.Parameters.AddWithValue("@startMonth", startMonthNum);
            cmd.Parameters.AddWithValue("@endYear", endYear);
            cmd.Parameters.AddWithValue("@endMonth", endMonthNum);

            Dictionary<string, Dictionary<string, decimal>> data = new Dictionary<string, Dictionary<string, decimal>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int year = Convert.ToInt32(reader["year"]);
                    int month = Convert.ToInt32(reader["month"]);
                    string key = string.Format("{0}-{1:D2}", year, month);

                    string type = reader["SurgeryType"].ToString();
                    decimal value = Convert.ToDecimal(reader["TotalValue"]);

                    if (!data.ContainsKey(key))
                    {
                        data[key] = new Dictionary<string, decimal>();
                    }

                    data[key][type] = value;
                }
            }

            foreach (var kvp in data.OrderBy(k => k.Key))
            {
                string monthLabel = kvp.Key;
                Dictionary<string, decimal> types = kvp.Value;

                result.rows.Add(new
                {
                    c = new List<object>
                {
                    new { v = monthLabel },
                    new { v = types.ContainsKey("אלקטיבי") ? types["אלקטיבי"] : 0 },
                    new { v = types.ContainsKey("ססיה") ? types["ססיה"] : 0 },
                    new { v = types.ContainsKey("דחוף") ? types["דחוף"] : 0 }
                }
                });
            }

            cnn.Close();
            return JsonConvert.SerializeObject(result, Formatting.Indented);
        }
        catch (Exception ex)
        {
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }


    public string ExploitationWeekly()
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);

        var result = new
        {
            cols = new List<object>
        {
            new { id = "A", label = "שבוע", type = "string" },
            new { id = "B", label = "אלקטיבי", type = "number" },
            new { id = "C", label = "ססיה", type = "number" },
            new { id = "D", label = "דחוף", type = "number" }
        },
            rows = new List<object>()
        };

        try
        {
            cnn.Open();

            // Step 1: determine current month's full weeks
            DateTime now = DateTime.Today;
            DateTime firstDayOfMonth = new DateTime(now.Year, now.Month, 1);
            DateTime startDate = firstDayOfMonth;
            DateTime endDate = firstDayOfMonth.AddMonths(1);

            // fallback logic (if not at least one full week in current month)
            if ((now - firstDayOfMonth).TotalDays < 7)
            {
                startDate = firstDayOfMonth.AddMonths(-1);
                endDate = firstDayOfMonth;
            }

            string query = @"
            SELECT 
                DATEPART(YEAR, [תאריך ניתוח]) AS SurgeryYear,
                DATEPART(WEEK, [תאריך ניתוח]) AS SurgeryWeek,
                [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                COUNT(*) AS Total
            FROM dbo.CH_AData
            WHERE 
                [תאריך ניתוח] >= @startDate AND [תאריך ניתוח] < @endDate
                AND [סוג ניתוח (דחוף / ססיה / אלקטיבי)] IS NOT NULL
            GROUP BY 
                DATEPART(YEAR, [תאריך ניתוח]), 
                DATEPART(WEEK, [תאריך ניתוח]), 
                [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
            ORDER BY SurgeryYear, SurgeryWeek
        ";

            SqlCommand cmd = new SqlCommand(query, cnn);
            cmd.Parameters.AddWithValue("@startDate", startDate);
            cmd.Parameters.AddWithValue("@endDate", endDate);

            var data = new Dictionary<string, Dictionary<string, int>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string weekLabel = string.Format("שבוע {0}-{1}", reader["SurgeryWeek"], reader["SurgeryYear"]);
                    string surgeryType = reader["SurgeryType"].ToString();
                    int total = Convert.ToInt32(reader["Total"]);

                    if (!data.ContainsKey(weekLabel))
                        data[weekLabel] = new Dictionary<string, int>();

                    data[weekLabel][surgeryType] = total;
                }
            }

            foreach (var week in data.OrderBy(d => d.Key))
            {
                var label = week.Key;
                var types = week.Value;

                result.rows.Add(new
                {
                    c = new List<object>
                {
                    new { v = label },
                    new { v = types.ContainsKey("אלקטיבי") ? types["אלקטיבי"] : 0 },
                    new { v = types.ContainsKey("ססיה") ? types["ססיה"] : 0 },
                    new { v = types.ContainsKey("דחוף") ? types["דחוף"] : 0 }
                }
                });
            }

            cnn.Close();
            return JsonConvert.SerializeObject(result, Formatting.Indented);
        }
        catch (Exception ex)
        {
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }


    // Income DIM

    public string GetIncome(int dimTimeTypeId, string subDesc = null)
    {
        var results = new List<object>();

        try
        {
            using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
            {
                cnn.Open();

                string query = @"
SELECT 
    b.aliasName,
    SUM(a.Charging) AS TotalCharging
FROM [DW_AggregationChargingDepartments] a
INNER JOIN DW_DimTimeTypesDetails b 
    ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID
INNER JOIN DW_DataTypesSub c 
    ON a.DIMDataTypeSubID = c.DIMDataTypeSubID
WHERE 
    a.DIMDataTypeID = 13
    AND b.DimTimeTypeID = @DimTimeTypeID
    AND (@SubDesc IS NULL OR c.DIMDataTypeSubDescSeode = @SubDesc)
    AND a.Charging IN (
        SELECT Charging
        FROM [DW_AggregationChargingDepartments] aa
        INNER JOIN DW_DimTimeTypesDetails bb 
            ON aa.DimTimeTypesDetailID = bb.DimTimeTypesDetailID
        INNER JOIN DW_DataTypesSub cc 
            ON aa.DIMDataTypeSubID = cc.DIMDataTypeSubID
        WHERE aa.DIMDataTypeID = 13
            AND bb.DimTimeTypeID = @DimTimeTypeID
            AND (@SubDesc IS NULL OR cc.DIMDataTypeSubDescSeode = @SubDesc)
        GROUP BY aa.Charging
        HAVING COUNT(*) = 1
    )
GROUP BY b.aliasName
ORDER BY b.aliasName;
";

                using (SqlCommand cmd = new SqlCommand(query, cnn))
                {
                    cmd.Parameters.AddWithValue("@DimTimeTypeID", dimTimeTypeId);
                    cmd.Parameters.AddWithValue("@SubDesc", string.IsNullOrWhiteSpace(subDesc) ? DBNull.Value : (object)subDesc);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            results.Add(new
                            {
                                aliasName = reader["aliasName"].ToString(),
                                TotalCharging = Convert.ToDouble(reader["TotalCharging"])
                            });
                        }
                    }
                }

                return JsonConvert.SerializeObject(results, Formatting.Indented);
            }
        }
        catch (Exception ex)
        {
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }



    public string GetChargingMetadata()
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT DISTINCT 
                    b.DIMDataTypeSubID,
                    b.DIMDataTypeSubDescSeode,
                    b.DIMDataTypeSubRoomSeode
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                WHERE t.DimTimeTypeID = 5
                ORDER BY b.DIMDataTypeSubRoomSeode, b.DIMDataTypeSubDescSeode
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                var departmentGroups = new Dictionary<string, object>();
                var departments = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string groupName = reader["DIMDataTypeSubRoomSeode"].ToString();
                        string deptName = reader["DIMDataTypeSubDescSeode"].ToString();
                        int deptId = Convert.ToInt32(reader["DIMDataTypeSubID"]);

                        // Store unique department group by name
                        if (!departmentGroups.ContainsKey(groupName))
                        {
                            departmentGroups[groupName] = new
                            {
                                groupName = groupName
                            };
                        }

                        departments.Add(new
                        {
                            deptId = deptId,
                            deptName = deptName,
                            groupName = groupName
                        });
                    }
                }

                var result = new
                {
                    departmentGroups = departmentGroups.Values,
                    departments = departments
                };

                return JsonConvert.SerializeObject(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in GetChargingMetadata: " + ex.Message);
                return JsonConvert.SerializeObject(new
                {
                    departmentGroups = new List<object>(),
                    departments = new List<object>()
                });
            }
        }
    }

    public string GetChargingChartData(string groupName, string deptId)
    {
        int? deptIdValue = null;

        if (!string.IsNullOrEmpty(deptId))
        {
            int temp;
            if (int.TryParse(deptId, out temp))
            {
                deptIdValue = temp;
            }
        }

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                    SELECT 
                        b.DIMDataTypeSubRoomSeode AS GroupName,
                        b.DIMDataTypeSubDescSeode AS DeptName,
                        t.aliasName AS YearAlias,
                        SUM(a.Charging) AS TotalCharging
                    FROM DW_AggregationChargingDepartments a
                    INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                    INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                    WHERE t.DimTimeTypeID = 5
                ";

                if (!string.IsNullOrEmpty(groupName))
                {
                    query += " AND b.DIMDataTypeSubRoomSeode = @groupName";
                }

                if (deptIdValue.HasValue)
                {
                    query += " AND b.DIMDataTypeSubID = @deptId";
                }

                query += @"
                    GROUP BY b.DIMDataTypeSubRoomSeode, b.DIMDataTypeSubDescSeode, t.aliasName
                    ORDER BY b.DIMDataTypeSubRoomSeode, b.DIMDataTypeSubDescSeode, t.aliasName
                ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                if (!string.IsNullOrEmpty(groupName))
                    cmd.Parameters.AddWithValue("@groupName", groupName);

                if (deptIdValue.HasValue)
                    cmd.Parameters.AddWithValue("@deptId", deptIdValue.Value);

                var resultList = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        resultList.Add(new
                        {
                            groupName = reader["GroupName"].ToString(),
                            deptName = reader["DeptName"].ToString(),
                            year = reader["YearAlias"].ToString(),
                            charging = reader["TotalCharging"] != DBNull.Value
                                ? Convert.ToDecimal(reader["TotalCharging"])
                                : 0
                        });
                    }
                }

                return JsonConvert.SerializeObject(resultList);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { error = ex.Message });
            }
        }
    }

    public string GetChargingChartMontlyData(string groupName, string deptId)
    {
        int? deptIdValue = null;

        if (!string.IsNullOrEmpty(deptId))
        {
            int temp;
            if (int.TryParse(deptId, out temp))
            {
                deptIdValue = temp;
            }
        }

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                    SELECT 
                        b.DIMDataTypeSubRoomSeode AS GroupName,
                        b.DIMDataTypeSubDescSeode AS DeptName,
                        t.aliasName AS YearAlias,
                        SUM(a.Charging) AS TotalCharging
                    FROM DW_AggregationChargingDepartments a
                    INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                    INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                    WHERE t.DimTimeTypeID = 7
                ";

                if (!string.IsNullOrEmpty(groupName))
                {
                    query += " AND b.DIMDataTypeSubRoomSeode = @groupName";
                }

                if (deptIdValue.HasValue)
                {
                    query += " AND b.DIMDataTypeSubID = @deptId";
                }

                query += @"
                    GROUP BY b.DIMDataTypeSubRoomSeode, b.DIMDataTypeSubDescSeode, t.aliasName
                    ORDER BY b.DIMDataTypeSubRoomSeode, b.DIMDataTypeSubDescSeode, t.aliasName
                ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                if (!string.IsNullOrEmpty(groupName))
                    cmd.Parameters.AddWithValue("@groupName", groupName);

                if (deptIdValue.HasValue)
                    cmd.Parameters.AddWithValue("@deptId", deptIdValue.Value);

                var resultList = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        resultList.Add(new
                        {
                            groupName = reader["GroupName"].ToString(),
                            deptName = reader["DeptName"].ToString(),
                            year = reader["YearAlias"].ToString(),
                            charging = reader["TotalCharging"] != DBNull.Value
                                ? Convert.ToDecimal(reader["TotalCharging"])
                                : 0
                        });
                    }
                }

                return JsonConvert.SerializeObject(resultList);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { error = ex.Message });
            }
        }
    }


    public class DepartmentDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
    }

    public class GroupWithDepartmentsDto
    {
        public string GroupId { get; set; }
        public string GroupName { get; set; }
        public List<DepartmentDto> Departments { get; set; }
    }


    public string GetGroupsWithDepartmentsE(string groupName = null, string deptName = null)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT DISTINCT 
                    b.DIMDataTypeSubRoomSeode AS RoomCode,
                    b.DIMDataTypeSubDescSeode AS DeptName
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b 
                    ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t 
                    ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                WHERE t.DimTimeTypesDetailID > 230";

                if (!string.IsNullOrEmpty(groupName))
                {
                    query += " AND b.DIMDataTypeSubRoomSeode = @GroupName";
                }

                if (!string.IsNullOrEmpty(deptName))
                {
                    query += " AND b.DIMDataTypeSubDescSeode = @DeptName";
                }

                query += " ORDER BY b.DIMDataTypeSubRoomSeode, b.DIMDataTypeSubDescSeode";

                SqlCommand cmd = new SqlCommand(query, cnn);

                if (!string.IsNullOrEmpty(groupName))
                {
                    cmd.Parameters.AddWithValue("@GroupName", groupName);
                }

                if (!string.IsNullOrEmpty(deptName))
                {
                    cmd.Parameters.AddWithValue("@DeptName", deptName);
                }

                var groupDict = new Dictionary<string, List<object>>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string roomCode = reader["RoomCode"] != DBNull.Value ? reader["RoomCode"].ToString() : "";
                        string dName = reader["DeptName"] != DBNull.Value ? reader["DeptName"].ToString() : "";

                        if (!groupDict.ContainsKey(roomCode))
                            groupDict[roomCode] = new List<object>();

                        groupDict[roomCode].Add(new
                        {
                            id = dName,
                            name = dName
                        });
                    }
                }

                var groupedResult = groupDict.Select(g => new
                {
                    groupId = g.Key,
                    groupName = g.Key,
                    departments = g.Value
                }).ToList();

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    data = groupedResult
                }, Formatting.Indented);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    message = "Failed to fetch group data.",
                    details = ex.Message
                });
            }
        }
    }

    public string GetChargingChartMonthlyDataE(string groupName = null, string deptName = null)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT  
                    b.DIMDataTypeSubRoomSeode AS RoomCode,
                    b.DIMDataTypeSubDescSeode AS DeptName,
                    t.DimTimeTypesDetailDesc AS Month,
                    SUM(CAST(a.Q AS INT)) AS Quantity,
                    SUM(CAST(a.Charging AS INT)) AS Charging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b 
                    ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t 
                    ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                WHERE t.DimTimeTypesDetailID > 230
                  AND (@GroupName IS NULL OR b.DIMDataTypeSubRoomSeode = @GroupName)
                  AND (@DeptName IS NULL OR b.DIMDataTypeSubDescSeode = @DeptName)
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode, 
                    b.DIMDataTypeSubDescSeode,
                    t.DimTimeTypesDetailDesc
                ORDER BY t.DimTimeTypesDetailDesc";

                SqlCommand cmd = new SqlCommand(query, cnn);
                cmd.Parameters.AddWithValue("@GroupName", (object)groupName ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@DeptName", (object)deptName ?? DBNull.Value);

                var results = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string month = reader["Month"] != DBNull.Value ? reader["Month"].ToString() : "";
                        int quantity = reader["Quantity"] != DBNull.Value ? Convert.ToInt32(reader["Quantity"]) : 0;
                        int charging = reader["Charging"] != DBNull.Value ? Convert.ToInt32(reader["Charging"]) : 0;

                        results.Add(new
                        {
                            month = month,
                            quantity = quantity,
                            charging = charging
                        });
                    }

                }

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    data = results
                }, Formatting.Indented);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    message = "Error retrieving monthly chart data.",
                    details = ex.Message
                });
            }
        }
    }

    public string GetChargingChartMonthlyDataEE(string groupName, string deptName)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                // Normalize parameters
                string g = string.IsNullOrWhiteSpace(groupName) ? "all" : groupName.Trim();
                string d = string.IsNullOrWhiteSpace(deptName) ? "all" : deptName.Trim();
                bool filterGroup = !g.Equals("all", StringComparison.OrdinalIgnoreCase);
                bool filterDept = !d.Equals("all", StringComparison.OrdinalIgnoreCase);

                // Your original T-SQL with NO filters
                string query = @"
                SELECT  
                    b.DIMDataTypeSubRoomSeode AS GroupName,
                    b.DIMDataTypeSubDescSeode AS DeptName,
                    tt.DimTimeTypeDesc,
                    t.DimTimeTypesDetailDesc AS Month,
                    SUM(CAST(a.Q AS INT)) AS Quantity,
                    SUM(CAST(a.Charging AS INT)) AS Charging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b 
                    ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t 
                    ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt 
                    ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    b.DIMDataTypeSubDescSeode,
                    tt.DimTimeTypeDesc,
                    t.DimTimeTypesDetailDesc
                ORDER BY t.DimTimeTypesDetailDesc";

                SqlCommand cmd = new SqlCommand(query, cnn);

                var allRows = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string group = reader["GroupName"].ToString().Trim();
                        string dept = reader["DeptName"].ToString().Trim();

                        // Filter in C#
                        if (filterGroup && !group.Equals(g, StringComparison.OrdinalIgnoreCase)) continue;
                        if (filterDept && !dept.Equals(d, StringComparison.OrdinalIgnoreCase)) continue;

                        allRows.Add(new
                        {
                            group = group,
                            department = dept,
                            month = reader["Month"].ToString(),
                            quantity = Convert.ToInt32(reader["Quantity"]),
                            charging = Convert.ToInt32(reader["Charging"])
                        });
                    }
                }

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    filters = new { group = g, dept = d },
                    count = allRows.Count,
                    data = allRows
                }, Formatting.Indented);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    success = false,
                    message = "Error retrieving data.",
                    details = ex.Message
                });
            }
        }
    }


    public string GetChargingChartMonthlyDataGF(string groupName, string deptName)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string g = string.IsNullOrWhiteSpace(groupName) ? "all" : groupName.Trim();
                string d = string.IsNullOrWhiteSpace(deptName) ? "all" : deptName.Trim();
                bool filterGroup = !g.Equals("all", StringComparison.OrdinalIgnoreCase);
                bool filterDept = !d.Equals("all", StringComparison.OrdinalIgnoreCase);

                string query = @"
                SELECT  
                    b.DIMDataTypeSubRoomSeode AS GroupName,
                    b.DIMDataTypeSubDescSeode AS DeptName,
                    t.DimTimeTypesDetailDesc AS Month,
                    SUM(CAST(a.Q AS INT)) AS Quantity,
                    SUM(CAST(a.Charging AS INT)) AS Charging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b 
                    ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t 
                    ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt 
                    ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    b.DIMDataTypeSubDescSeode,
                    t.DimTimeTypesDetailDesc
                ORDER BY t.DimTimeTypesDetailDesc";

                SqlCommand cmd = new SqlCommand(query, cnn);

                var chartRows = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string group = reader["GroupName"].ToString().Trim();
                        string dept = reader["DeptName"].ToString().Trim();

                        if (filterGroup && !group.Equals(g, StringComparison.OrdinalIgnoreCase)) continue;
                        if (filterDept && !dept.Equals(d, StringComparison.OrdinalIgnoreCase)) continue;

                        string month = reader["Month"].ToString();
                        int quantity = Convert.ToInt32(reader["Quantity"]);
                        int charging = Convert.ToInt32(reader["Charging"]);

                        chartRows.Add(new
                        {
                            c = new object[]
                            {
                            new { v = month },
                            new { v = quantity },
                            new { v = charging }
                            }
                        });
                    }
                }

                var chartData = new
                {
                    cols = new[]
                    {
                    new { id = "month", label = "חודש", type = "string" },
                    new { id = "quantity", label = "כמות", type = "number" },
                    new { id = "charging", label = "חיובים", type = "number" }
                },
                    rows = chartRows
                };

                return JsonConvert.SerializeObject(chartData, Formatting.Indented);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    error = true,
                    message = "Failed to retrieve chart data",
                    details = ex.Message
                });
            }
        }
    }

    public string GetChargingChartMonthlyDataEEAnnot(string groupName, string deptName)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string g = string.IsNullOrWhiteSpace(groupName) ? "all" : groupName.Trim();
                string d = string.IsNullOrWhiteSpace(deptName) ? "all" : deptName.Trim();
                bool filterGroup = !g.Equals("all", StringComparison.OrdinalIgnoreCase);
                bool filterDept = !d.Equals("all", StringComparison.OrdinalIgnoreCase);

                string query = @"
                SELECT  
                    b.DIMDataTypeSubRoomSeode AS GroupName,
                    b.DIMDataTypeSubDescSeode AS DeptName,
                    t.DimTimeTypesDetailDesc AS Month,
                    SUM(CAST(a.Q AS INT)) AS Quantity,
                    SUM(CAST(a.Charging AS INT)) AS Charging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    b.DIMDataTypeSubDescSeode,
                    t.DimTimeTypesDetailDesc
                ORDER BY t.DimTimeTypesDetailDesc";

                SqlCommand cmd = new SqlCommand(query, cnn);
                var chartRows = new List<object>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        string group = reader["GroupName"].ToString().Trim();
                        string dept = reader["DeptName"].ToString().Trim();

                        if (filterGroup && !group.Equals(g, StringComparison.OrdinalIgnoreCase)) continue;
                        if (filterDept && !dept.Equals(d, StringComparison.OrdinalIgnoreCase)) continue;

                        string month = reader["Month"].ToString();
                        int quantity = Convert.ToInt32(reader["Quantity"]);
                        int charging = Convert.ToInt32(reader["Charging"]);

                        chartRows.Add(new
                        {
                            c = new object[]
                            {
                            new { v = month },
                            new { v = quantity },
                            new { v = quantity.ToString() },
                            new { v = charging },
                            new { v = string.Format("{0:N0}", charging) }
                            }
                        });
                    }
                }

                var cols = new List<object>();
                cols.Add(new { id = "month", label = "חודש", type = "string" });
                cols.Add(new { id = "quantity", label = "כמות", type = "number" });
                cols.Add(new { role = "annotation", type = "string" });
                cols.Add(new { id = "charging", label = "חיובים", type = "number" });
                cols.Add(new { role = "annotation", type = "string" });

                var chartData = new
                {
                    cols = cols,
                    rows = chartRows
                };

                return JsonConvert.SerializeObject(chartData, Formatting.Indented);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    error = true,
                    message = "Failed to retrieve chart data",
                    details = ex.Message
                });
            }
        }
    }


    public string GetChargingChartMonthlyDataEEx()
    {
        return GetChargingChartMonthlyDataEExCore(null, null, null, null, null, null, null,
        "absolute", false, false, false, null, null, "month", "json", null
        );
    }





    public string GetChargingChartMonthlyDataEExCore(string fromMonth, string toMonth, string groupName, string deptName, string roomCode, string timeType, string metric, string calcMode, bool compareToLast, bool normalize, bool showAnnotations, string sortBy, string order, string groupBy, string format, string chartType)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string g = string.IsNullOrWhiteSpace(groupName) ? "all" : groupName.Trim();
                string d = string.IsNullOrWhiteSpace(deptName) ? "all" : deptName.Trim();
                bool filterGroup = !g.Equals("all", StringComparison.OrdinalIgnoreCase);
                bool filterDept = !d.Equals("all", StringComparison.OrdinalIgnoreCase);

                string query = @"
                SELECT  
                    b.DIMDataTypeSubRoomSeode AS GroupName,
                    b.DIMDataTypeSubDescSeode AS DeptName,
                    t.DimTimeTypesDetailDesc AS Month,
                    LEFT(t.DimTimeTypesDetailDesc, 4) AS Year,
                    SUM(CAST(a.Q AS INT)) AS Quantity,
                    SUM(CAST(a.Charging AS INT)) AS Charging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    b.DIMDataTypeSubDescSeode,
                    t.DimTimeTypesDetailDesc
                ORDER BY t.DimTimeTypesDetailDesc";

                SqlCommand cmd = new SqlCommand(query, cnn);
                SqlDataReader reader = cmd.ExecuteReader();

                var data = new List<Dictionary<string, object>>();

                while (reader.Read())
                {
                    string group = reader["GroupName"] != DBNull.Value ? reader["GroupName"].ToString().Trim() : "";
                    string dept = reader["DeptName"] != DBNull.Value ? reader["DeptName"].ToString().Trim() : "";
                    string month = reader["Month"] != DBNull.Value ? reader["Month"].ToString() : "";
                    string year = reader["Year"] != DBNull.Value ? reader["Year"].ToString() : "";

                    if (filterGroup && !group.Equals(g, StringComparison.OrdinalIgnoreCase)) continue;
                    if (filterDept && !dept.Equals(d, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(fromMonth) && string.Compare(month, fromMonth) < 0) continue;
                    if (!string.IsNullOrEmpty(toMonth) && string.Compare(month, toMonth) > 0) continue;

                    int quantity = Convert.ToInt32(reader["Quantity"]);
                    int charging = Convert.ToInt32(reader["Charging"]);

                    var row = new Dictionary<string, object>();
                    row["month"] = month;
                    row["year"] = year;
                    row["group"] = group;
                    row["dept"] = dept;
                    row["quantity"] = quantity;
                    row["charging"] = charging;

                    data.Add(row);
                }

                reader.Close();

                var grouped = new Dictionary<string, Dictionary<string, object>>();
                foreach (var row in data)
                {
                    string key = row.ContainsKey("year") && groupBy == "year" ? row["year"].ToString() :
                                 row.ContainsKey("group") && groupBy == "group" ? row["group"].ToString() :
                                 row.ContainsKey("dept") && groupBy == "dept" ? row["dept"].ToString() :
                                 row.ContainsKey("month") ? row["month"].ToString() : "";

                    if (!grouped.ContainsKey(key))
                    {
                        var entry = new Dictionary<string, object>();
                        entry["key"] = key;
                        entry["quantity"] = 0;
                        entry["charging"] = 0;
                        grouped[key] = entry;
                    }

                    grouped[key]["quantity"] = (int)grouped[key]["quantity"] + (int)row["quantity"];
                    grouped[key]["charging"] = (int)grouped[key]["charging"] + (int)row["charging"];
                }

                var resultList = grouped.Values
                    .Where(delegate (Dictionary<string, object> x) { return x != null && x.ContainsKey("key"); })
                    .OrderBy(delegate (Dictionary<string, object> x) { return x["key"].ToString(); })
                    .ToList();


                if (resultList.Count > 0)
                {
                    string lastKey = resultList[resultList.Count - 1]["key"].ToString();
                    DateTime parsed;
                    if (DateTime.TryParse(lastKey + "-01", out parsed))
                    {
                        DateTime today = DateTime.Today;
                        if (parsed.Year == today.Year && parsed.Month == today.Month && today.Day < 11)
                        {
                            resultList.RemoveAt(resultList.Count - 1);
                        }
                    }
                }


                if (resultList.Count > 0)
                {
                    resultList.RemoveAt(resultList.Count - 1);
                }

                if (calcMode == "cumulative")
                {
                    int cumulativeQuantity = 0;
                    int cumulativeCharging = 0;
                    foreach (var item in resultList)
                    {
                        cumulativeQuantity += Convert.ToInt32(item["quantity"]);
                        cumulativeCharging += Convert.ToInt32(item["charging"]);
                        item["quantity"] = cumulativeQuantity;
                        item["charging"] = cumulativeCharging;
                    }
                }
                else if (calcMode == "avg" && resultList.Count > 0)
                {
                    int totalQuantity = 0;
                    int totalCharging = 0;
                    for (int i = 0; i < resultList.Count; i++)
                    {
                        totalQuantity += Convert.ToInt32(resultList[i]["quantity"]);
                        totalCharging += Convert.ToInt32(resultList[i]["charging"]);
                    }
                    int count = resultList.Count;
                    for (int i = 0; i < resultList.Count; i++)
                    {
                        resultList[i]["quantity"] = Math.Round((double)totalQuantity / count, 2);
                        resultList[i]["charging"] = Math.Round((double)totalCharging / count, 2);
                    }
                }

                if (compareToLast && resultList.Count > 1)
                {
                    for (int i = resultList.Count - 1; i >= 1; i--)
                    {
                        int currentQ = Convert.ToInt32(resultList[i]["quantity"]);
                        int prevQ = Convert.ToInt32(resultList[i - 1]["quantity"]);
                        resultList[i]["quantity"] = currentQ - prevQ;

                        int currentC = Convert.ToInt32(resultList[i]["charging"]);
                        int prevC = Convert.ToInt32(resultList[i - 1]["charging"]);
                        resultList[i]["charging"] = currentC - prevC;
                    }
                }

                if (format == "google")
                {
                    var cols = new List<object>();
                    cols.Add(new { id = "key", label = groupBy, type = "string" });
                    cols.Add(new { id = "quantity", label = "כמות", type = "number" });
                    if (showAnnotations)
                        cols.Add(new { role = "annotation", type = "string" });
                    cols.Add(new { id = "charging", label = "חיובים", type = "number" });
                    if (showAnnotations)
                        cols.Add(new { role = "annotation", type = "string" });

                    var rows = new List<object>();
                    foreach (var r in resultList)
                    {
                        var row = new List<object>();
                        row.Add(new { v = r["key"] });
                        row.Add(new { v = r["quantity"] });
                        if (showAnnotations)
                            row.Add(new { v = r["quantity"].ToString() });
                        row.Add(new { v = r["charging"] });
                        if (showAnnotations)
                            row.Add(new { v = string.Format("{0:N0}", r["charging"]) });

                        rows.Add(new { c = row });
                    }

                    return JsonConvert.SerializeObject(new { cols = cols, rows = rows }, Formatting.Indented);
                }

                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    total = resultList.Count,
                    data = resultList
                }, Formatting.Indented);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new
                {
                    error = true,
                    message = "Failed to generate chart data",
                    details = ex.Message
                });
            }
        }
    }





    public class ChartRow
    {
        public string Key { get; set; }
        public object Quantity { get; set; }
        public object Charging { get; set; }
    }

    public class ChartResult
    {
        public bool Success { get; set; }
        public int Total { get; set; }
        public List<ChartRow> Data { get; set; }
        public List<object> Cols { get; set; }
        public List<object> Rows { get; set; }
        public bool Error { get; set; }
        public string Message { get; set; }
        public string Details { get; set; }
    }

    public ChartResult GetChargingChartMonthlyDataEExCoreClass(string fromMonth, string toMonth, string groupName, string deptName, string roomCode, string timeType, string metric, string calcMode, bool compareToLast, bool normalize, bool showAnnotations, string sortBy, string order, string groupBy, string format, string chartType)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string g = string.IsNullOrWhiteSpace(groupName) ? "all" : groupName.Trim();
                string d = string.IsNullOrWhiteSpace(deptName) ? "all" : deptName.Trim();
                bool filterGroup = !g.Equals("all", StringComparison.OrdinalIgnoreCase);
                bool filterDept = !d.Equals("all", StringComparison.OrdinalIgnoreCase);

                string query = @"
                SELECT  
                    b.DIMDataTypeSubRoomSeode AS GroupName,
                    b.DIMDataTypeSubDescSeode AS DeptName,
                    t.DimTimeTypesDetailDesc AS Month,
                    LEFT(t.DimTimeTypesDetailDesc, 4) AS Year,
                    SUM(CAST(a.Q AS INT)) AS Quantity,
                    SUM(CAST(a.Charging AS INT)) AS Charging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    b.DIMDataTypeSubDescSeode,
                    t.DimTimeTypesDetailDesc
                ORDER BY t.DimTimeTypesDetailDesc";

                SqlCommand cmd = new SqlCommand(query, cnn);
                SqlDataReader reader = cmd.ExecuteReader();

                var data = new List<Dictionary<string, object>>();

                while (reader.Read())
                {
                    string group = reader["GroupName"] != DBNull.Value ? reader["GroupName"].ToString().Trim() : "";
                    string dept = reader["DeptName"] != DBNull.Value ? reader["DeptName"].ToString().Trim() : "";
                    string month = reader["Month"] != DBNull.Value ? reader["Month"].ToString() : "";
                    string year = reader["Year"] != DBNull.Value ? reader["Year"].ToString() : "";


                    if (filterGroup && !group.Equals(g, StringComparison.OrdinalIgnoreCase)) continue;
                    if (filterDept && !dept.Equals(d, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(fromMonth) && string.Compare(month, fromMonth) < 0) continue;
                    if (!string.IsNullOrEmpty(toMonth) && string.Compare(month, toMonth) > 0) continue;

                    int quantity = Convert.ToInt32(reader["Quantity"]);
                    int charging = Convert.ToInt32(reader["Charging"]);

                    var row = new Dictionary<string, object>
                {
                    { "month", month },
                    { "year", year },
                    { "group", group },
                    { "dept", dept },
                    { "quantity", quantity },
                    { "charging", charging }
                };

                    data.Add(row);
                }

                reader.Close();

                // Choose grouping level
                var grouped = new Dictionary<string, Dictionary<string, object>>();
                foreach (var row in data)
                {
                    string key = groupBy == "year" ? row["year"].ToString()
                               : groupBy == "group" ? row["group"].ToString()
                               : groupBy == "dept" ? row["dept"].ToString()
                               : row["month"].ToString(); // default = month

                    if (!grouped.ContainsKey(key))
                    {
                        grouped[key] = new Dictionary<string, object>
                    {
                        { "key", key },
                        { "quantity", 0 },
                        { "charging", 0 }
                    };
                    }

                    grouped[key]["quantity"] = (int)grouped[key]["quantity"] + (int)row["quantity"];
                    grouped[key]["charging"] = (int)grouped[key]["charging"] + (int)row["charging"];
                }

                // Convert to list and sort
                var resultList = grouped.Values
                .Where(x => x != null && x.ContainsKey("key"))
                .OrderBy(x => x["key"].ToString())
                .ToList();


                // Cumulative calculation
                if (calcMode == "cumulative")
                {
                    int cumulativeQuantity = 0;
                    int cumulativeCharging = 0;

                    foreach (var item in resultList)
                    {
                        cumulativeQuantity += item.ContainsKey("quantity") ? Convert.ToInt32(item["quantity"]) : 0;
                        cumulativeCharging += item.ContainsKey("charging") ? Convert.ToInt32(item["charging"]) : 0;

                        item["quantity"] = cumulativeQuantity;
                        item["charging"] = cumulativeCharging;
                    }
                }

                // Average calculation
                else if (calcMode == "avg" && resultList.Count > 0)
                {
                    int totalQuantity = resultList.Sum(r => r.ContainsKey("quantity") ? Convert.ToInt32(r["quantity"]) : 0);
                    int totalCharging = resultList.Sum(r => r.ContainsKey("charging") ? Convert.ToInt32(r["charging"]) : 0);
                    int count = resultList.Count;

                    foreach (var item in resultList)
                    {
                        item["quantity"] = Math.Round((double)totalQuantity / count, 2);
                        item["charging"] = Math.Round((double)totalCharging / count, 2);
                    }
                }

                // Compare to last period
                if (compareToLast && resultList.Count > 1)
                {
                    for (int i = resultList.Count - 1; i >= 1; i--)
                    {
                        int currentQ = Convert.ToInt32(resultList[i]["quantity"]);
                        int prevQ = Convert.ToInt32(resultList[i - 1]["quantity"]);
                        resultList[i]["quantity"] = currentQ - prevQ;

                        int currentC = Convert.ToInt32(resultList[i]["charging"]);
                        int prevC = Convert.ToInt32(resultList[i - 1]["charging"]);
                        resultList[i]["charging"] = currentC - prevC;
                    }
                }

                if (format == "google")
                {
                    var cols = new List<object>
                {
                    new { id = "key", label = groupBy, type = "string" },
                    new { id = "quantity", label = "כמות", type = "number" }
                };
                    if (showAnnotations) cols.Add(new { role = "annotation", type = "string" });
                    cols.Add(new { id = "charging", label = "חיובים", type = "number" });
                    if (showAnnotations) cols.Add(new { role = "annotation", type = "string" });

                    var rows = new List<object>();
                    foreach (var r in resultList)
                    {
                        var row = new List<object>
                    {
                        new { v = r["key"] },
                        new { v = r["quantity"] }
                    };
                        if (showAnnotations) row.Add(new { v = r["quantity"].ToString() });
                        row.Add(new { v = r["charging"] });
                        if (showAnnotations) row.Add(new { v = string.Format("{0:N0}", r["charging"]) });

                        rows.Add(new { c = row });
                    }


                    return new ChartResult
                    {
                        Success = true,
                        Total = resultList.Count,
                        Data = resultList.Select(r => new ChartRow
                        {
                            Key = r["key"].ToString(),
                            Quantity = r["quantity"],
                            Charging = r["charging"]
                        }).ToList()
                    };
                }

                // Fallback output
                return new ChartResult
                {
                    Success = true,
                    Total = resultList.Count,
                    Data = resultList.Select(r => new ChartRow
                    {
                        Key = r["key"].ToString(),
                        Quantity = r["quantity"],
                        Charging = r["charging"]
                    }).ToList()
                };
            }
            catch (Exception ex)
            {
                return new ChartResult
                {
                    Error = true,
                    Message = "Failed to generate chart data",
                    Details = ex.Message
                };
            }
        }
    }


    public ChartResult GetChargingChartMonthlyDEC(string fromMonth, string toMonth, string groupName, string deptName, string roomCode, string timeType, string metric, string calcMode, bool compareToLast, bool normalize, bool showAnnotations, string sortBy, string order, string groupBy, string format, string chartType)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string g = string.IsNullOrWhiteSpace(groupName) ? "all" : groupName.Trim();
                string d = string.IsNullOrWhiteSpace(deptName) ? "all" : deptName.Trim();
                bool filterGroup = !g.Equals("all", StringComparison.OrdinalIgnoreCase);
                bool filterDept = !d.Equals("all", StringComparison.OrdinalIgnoreCase);

                string query = @"
                SELECT  
                    b.DIMDataTypeSubRoomSeode AS GroupName,
                    b.DIMDataTypeSubDescSeode AS DeptName,
                    t.DimTimeTypesDetailDesc AS Month,
                    LEFT(t.DimTimeTypesDetailDesc, 4) AS Year,
                    SUM(CAST(a.Q AS INT)) AS Quantity,
                    SUM(CAST(a.Charging AS INT)) AS Charging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    b.DIMDataTypeSubDescSeode,
                    t.DimTimeTypesDetailDesc
                ORDER BY t.DimTimeTypesDetailDesc";

                SqlCommand cmd = new SqlCommand(query, cnn);
                SqlDataReader reader = cmd.ExecuteReader();

                var data = new List<Dictionary<string, object>>();

                while (reader.Read())
                {
                    string group = reader["GroupName"] != DBNull.Value ? reader["GroupName"].ToString().Trim() : "";
                    string dept = reader["DeptName"] != DBNull.Value ? reader["DeptName"].ToString().Trim() : "";
                    string month = reader["Month"] != DBNull.Value ? reader["Month"].ToString() : "";
                    string year = reader["Year"] != DBNull.Value ? reader["Year"].ToString() : "";


                    if (filterGroup && !group.Equals(g, StringComparison.OrdinalIgnoreCase)) continue;
                    if (filterDept && !dept.Equals(d, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(fromMonth) && string.Compare(month, fromMonth) < 0) continue;
                    if (!string.IsNullOrEmpty(toMonth) && string.Compare(month, toMonth) > 0) continue;

                    int quantity = Convert.ToInt32(reader["Quantity"]);
                    int charging = Convert.ToInt32(reader["Charging"]);

                    var row = new Dictionary<string, object>
                {
                    { "month", month },
                    { "year", year },
                    { "group", group },
                    { "dept", dept },
                    { "quantity", quantity },
                    { "charging", charging }
                };

                    data.Add(row);
                }

                reader.Close();

                // Choose grouping level
                var grouped = new Dictionary<string, Dictionary<string, object>>();
                foreach (var row in data)
                {
                    string key = groupBy == "year" ? row["year"].ToString()
                               : groupBy == "group" ? row["group"].ToString()
                               : groupBy == "dept" ? row["dept"].ToString()
                               : row["month"].ToString(); // default = month

                    if (!grouped.ContainsKey(key))
                    {
                        grouped[key] = new Dictionary<string, object>
                    {
                        { "key", key },
                        { "quantity", 0 },
                        { "charging", 0 }
                    };
                    }

                    grouped[key]["quantity"] = (int)grouped[key]["quantity"] + (int)row["quantity"];
                    grouped[key]["charging"] = (int)grouped[key]["charging"] + (int)row["charging"];
                }

                // Convert to list and sort
                var resultList = grouped.Values
                .Where(x => x != null && x.ContainsKey("key"))
                .OrderBy(x => x["key"].ToString())
                .ToList();


                // Cumulative calculation
                if (calcMode == "cumulative")
                {
                    int cumulativeQuantity = 0;
                    int cumulativeCharging = 0;

                    foreach (var item in resultList)
                    {
                        cumulativeQuantity += item.ContainsKey("quantity") ? Convert.ToInt32(item["quantity"]) : 0;
                        cumulativeCharging += item.ContainsKey("charging") ? Convert.ToInt32(item["charging"]) : 0;

                        item["quantity"] = cumulativeQuantity;
                        item["charging"] = cumulativeCharging;
                    }
                }

                // Average calculation
                else if (calcMode == "avg" && resultList.Count > 0)
                {
                    int totalQuantity = resultList.Sum(r => r.ContainsKey("quantity") ? Convert.ToInt32(r["quantity"]) : 0);
                    int totalCharging = resultList.Sum(r => r.ContainsKey("charging") ? Convert.ToInt32(r["charging"]) : 0);
                    int count = resultList.Count;

                    foreach (var item in resultList)
                    {
                        item["quantity"] = Math.Round((double)totalQuantity / count, 2);
                        item["charging"] = Math.Round((double)totalCharging / count, 2);
                    }
                }

                // Compare to last period
                if (compareToLast && resultList.Count > 1)
                {
                    for (int i = resultList.Count - 1; i >= 1; i--)
                    {
                        int currentQ = Convert.ToInt32(resultList[i]["quantity"]);
                        int prevQ = Convert.ToInt32(resultList[i - 1]["quantity"]);
                        resultList[i]["quantity"] = currentQ - prevQ;

                        int currentC = Convert.ToInt32(resultList[i]["charging"]);
                        int prevC = Convert.ToInt32(resultList[i - 1]["charging"]);
                        resultList[i]["charging"] = currentC - prevC;
                    }
                }

                if (format == "google")
                {
                    var cols = new List<object>
                {
                    new { id = "key", label = groupBy, type = "string" },
                    new { id = "quantity", label = "כמות", type = "number" }
                };
                    if (showAnnotations) cols.Add(new { role = "annotation", type = "string" });
                    cols.Add(new { id = "charging", label = "חיובים", type = "number" });
                    if (showAnnotations) cols.Add(new { role = "annotation", type = "string" });

                    var rows = new List<object>();
                    foreach (var r in resultList)
                    {
                        var row = new List<object>
                    {
                        new { v = r["key"] },
                        new { v = r["quantity"] }
                    };
                        if (showAnnotations) row.Add(new { v = r["quantity"].ToString() });
                        row.Add(new { v = r["charging"] });
                        if (showAnnotations) row.Add(new { v = string.Format("{0:N0}", r["charging"]) });

                        rows.Add(new { c = row });
                    }


                    return new ChartResult
                    {
                        Success = true,
                        Total = resultList.Count,
                        Data = resultList.Select(r => new ChartRow
                        {
                            Key = r["key"].ToString(),
                            Quantity = r["quantity"],
                            Charging = r["charging"]
                        }).ToList()
                    };
                }

                // Fallback output
                return new ChartResult
                {
                    Success = true,
                    Total = resultList.Count,
                    Data = resultList.Select(r => new ChartRow
                    {
                        Key = r["key"].ToString(),
                        Quantity = r["quantity"],
                        Charging = r["charging"]
                    }).ToList()
                };
            }
            catch (Exception ex)
            {
                return new ChartResult
                {
                    Error = true,
                    Message = "Failed to generate chart data",
                    Details = ex.Message
                };
            }
        }
    }



    public string GetChargingGrouspData(string groupName, string deptId)
    {
        int? deptIdValue = null;

        if (!string.IsNullOrEmpty(deptId))
        {
            int temp;
            if (int.TryParse(deptId, out temp))
            {
                deptIdValue = temp;
            }
        }

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT 
                    b.DIMDataTypeSubRoomSeode AS Department,
                    SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4) AS [Year],
                    SUM(CAST(a.Q AS INT)) AS TotalQ,
                    SUM(CAST(a.Charging AS INT)) AS TotalCharging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                  AND CAST(SUBSTRING(t.DimTimeTypesDetailDesc, 6, 2) AS INT) <= 
                      CASE 
                          WHEN DAY(GETDATE()) <= 10 THEN MONTH(GETDATE()) - 2 
                          ELSE MONTH(GETDATE()) - 1 
                      END
                  AND SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4) IN ('2024', '2025')
            ";

                if (!string.IsNullOrEmpty(groupName))
                {
                    query += " AND b.DIMDataTypeSubRoomSeode = @groupName";
                }

                if (deptIdValue.HasValue)
                {
                    query += " AND b.DIMDataTypeSubID = @deptId";
                }

                query += @"
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4)
                ORDER BY 
                    b.DIMDataTypeSubRoomSeode,
                    SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4)
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                if (!string.IsNullOrEmpty(groupName))
                    cmd.Parameters.AddWithValue("@groupName", groupName);

                if (deptIdValue.HasValue)
                    cmd.Parameters.AddWithValue("@deptId", deptIdValue.Value);

                List<Dictionary<string, object>> resultList = new List<Dictionary<string, object>>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        Dictionary<string, object> row = new Dictionary<string, object>();
                        row["department"] = reader["Department"] != DBNull.Value ? reader["Department"].ToString() : "";
                        row["year"] = reader["Year"] != DBNull.Value ? reader["Year"].ToString() : "";
                        row["totalQ"] = reader["TotalQ"] != DBNull.Value ? Convert.ToInt32(reader["TotalQ"]) : 0;
                        row["totalCharging"] = reader["TotalCharging"] != DBNull.Value ? Convert.ToInt32(reader["TotalCharging"]) : 0;

                        resultList.Add(row);
                    }
                }

                return JsonConvert.SerializeObject(resultList);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { error = ex.Message });
            }
        }
    }



    public class YearlyIncomeRow
    {
        public int Year { get; set; }
        public double TotalCharging { get; set; }
        public string Change { get; set; }
        public string ChangePercent { get; set; }
    }

    public string GetYearlyIncomeFYData(int dimTimeTypeId, string subDesc = null, int change = 0, int changeperc = 0)
    {
        var results = new List<YearlyIncomeRow>();

        try
        {
            using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
            {
                cnn.Open();

                string query = @"
SELECT 
    b.aliasName,
    SUM(a.Charging) AS TotalCharging
FROM [DW_AggregationChargingDepartments] a
INNER JOIN DW_DimTimeTypesDetails b 
    ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID
INNER JOIN DW_DataTypesSub c 
    ON a.DIMDataTypeSubID = c.DIMDataTypeSubID
WHERE 
    a.DIMDataTypeID = 13
    AND b.DimTimeTypeID = @DimTimeTypeID
    AND (@SubDesc IS NULL OR c.DIMDataTypeSubDescSeode = @SubDesc)
    AND a.Charging IN (
        SELECT Charging
        FROM [DW_AggregationChargingDepartments] aa
        INNER JOIN DW_DimTimeTypesDetails bb 
            ON aa.DimTimeTypesDetailID = bb.DimTimeTypesDetailID
        INNER JOIN DW_DataTypesSub cc 
            ON aa.DIMDataTypeSubID = cc.DIMDataTypeSubID
        WHERE aa.DIMDataTypeID = 13
            AND bb.DimTimeTypeID = @DimTimeTypeID
            AND (@SubDesc IS NULL OR cc.DIMDataTypeSubDescSeode = @SubDesc)
        GROUP BY aa.Charging
        HAVING COUNT(*) = 1
    )
GROUP BY b.aliasName
ORDER BY b.aliasName;
";

                using (SqlCommand cmd = new SqlCommand(query, cnn))
                {
                    cmd.Parameters.AddWithValue("@DimTimeTypeID", dimTimeTypeId);
                    cmd.Parameters.AddWithValue("@SubDesc", string.IsNullOrWhiteSpace(subDesc) ? DBNull.Value : (object)subDesc);

                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        int currentYear = DateTime.Now.Year;

                        while (reader.Read())
                        {
                            string aliasName = reader["aliasName"].ToString();
                            int offset = 0;
                            int.TryParse(aliasName, out offset);

                            var row = new YearlyIncomeRow();
                            row.Year = currentYear + offset;
                            row.TotalCharging = Convert.ToDouble(reader["TotalCharging"]);
                            row.Change = null;
                            row.ChangePercent = null;

                            results.Add(row);
                        }
                    }
                }


                results.Sort((a, b) => a.Year.CompareTo(b.Year));

                if ((change == 1 || changeperc == 1) && results.Count > 1)
                {
                    for (int i = 1; i < results.Count; i++)
                    {
                        double current = results[i].TotalCharging;
                        double previous = results[i - 1].TotalCharging;

                        if (change == 1)
                        {
                            double diff = current - previous;
                            string sign = diff >= 0 ? "+" : "";
                            results[i].Change = sign + diff.ToString("0.##");
                        }

                        if (changeperc == 1)
                        {
                            if (previous == 0)
                            {
                                results[i].ChangePercent = "N/A";
                            }
                            else
                            {
                                double percent = ((current - previous) / previous) * 100;
                                string sign = percent > 0 ? "+" : percent < 0 ? "-" : "";
                                results[i].ChangePercent = sign + Math.Abs(percent).ToString("0.0") + "%";
                            }
                        }
                    }
                }

                return JsonConvert.SerializeObject(results, Formatting.Indented);
            }
        }
        catch (Exception ex)
        {
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }

    public string GetYearlyIncomeFYLData(int change = 0, int changeperc = 0)
    {
        var results = new List<YearlyIncomeRow>();

        try
        {
            using (var cnn = new SqlConnection(connetionStringNAMER))
            {
                cnn.Open();

                var query = @"
                SELECT 
                    b.aliasName AS Year,
                    SUM(a.Charging) AS TotalCharging
                FROM [DW_AggregationChargingDepartments] a
                INNER JOIN DW_DimTimeTypesDetails b 
                    ON a.DimTimeTypesDetailID = b.DimTimeTypesDetailID
                WHERE a.DIMDataTypeID = 13 
                  AND b.DimTimeTypeID = 4
                GROUP BY b.aliasName
                ORDER BY b.aliasName DESC;";

                using (var cmd = new SqlCommand(query, cnn))
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var alias = reader["Year"].ToString().Trim();
                        int year;
                        if (!int.TryParse(alias, out year))
                            continue;

                        var row = new YearlyIncomeRow();
                        row.Year = year;
                        row.TotalCharging = Convert.ToDouble(reader["TotalCharging"]);
                        row.Change = null;
                        row.ChangePercent = null;

                        results.Add(row);
                    }
                }

                results.Sort(delegate (YearlyIncomeRow a, YearlyIncomeRow b)
                {
                    return a.Year.CompareTo(b.Year);
                });

                if ((change == 1 || changeperc == 1) && results.Count > 1)
                {
                    for (int i = 1; i < results.Count; i++)
                    {
                        double current = results[i].TotalCharging;
                        double previous = results[i - 1].TotalCharging;

                        if (change == 1)
                        {
                            double diff = current - previous;
                            string sign = diff >= 0 ? "+" : "";
                            results[i].Change = sign + diff.ToString("0.##");
                        }

                        if (changeperc == 1)
                        {
                            if (previous == 0)
                            {
                                results[i].ChangePercent = "N/A";
                            }
                            else
                            {
                                double percent = ((current - previous) / previous) * 100;
                                string sign = percent > 0 ? "+" : percent < 0 ? "-" : "";
                                results[i].ChangePercent = sign + Math.Abs(percent).ToString("0.0") + "%";
                            }
                        }
                    }
                }

                return JsonConvert.SerializeObject(results, Formatting.Indented);
            }
        }
        catch (Exception ex)
        {
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }


    public string GetChargingGrouspDataEx(string groupName, string deptId)
    {
        int? deptIdValue = null;

        if (!string.IsNullOrEmpty(deptId))
        {
            int temp;
            if (int.TryParse(deptId, out temp))
            {
                deptIdValue = temp;
            }
        }

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT 
                    b.DIMDataTypeSubRoomSeode AS Department,
                    SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4) AS [Year],
                    SUM(CAST(a.Q AS INT)) AS TotalQ,
                    SUM(CAST(a.Charging AS INT)) AS TotalCharging
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b ON a.DIMDataTypeSubID = b.DIMDataTypeSubID
                INNER JOIN DW_DimTimeTypesDetails t ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID
                INNER JOIN DW_DimTimeTypes tt ON t.DimTimeTypeID = tt.DimTimeTypeID
                WHERE t.DimTimeTypesDetailID > 230
                  AND CAST(SUBSTRING(t.DimTimeTypesDetailDesc, 6, 2) AS INT) <= 
                      CASE 
                          WHEN DAY(GETDATE()) <= 10 THEN MONTH(GETDATE()) - 2 
                          ELSE MONTH(GETDATE()) - 1 
                      END
                  AND SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4) IN ('2024', '2025')
            ";

                if (!string.IsNullOrEmpty(groupName))
                {
                    query += " AND b.DIMDataTypeSubRoomSeode = @groupName";
                }

                if (deptIdValue.HasValue)
                {
                    query += " AND b.DIMDataTypeSubID = @deptId";
                }

                query += @"
                GROUP BY 
                    b.DIMDataTypeSubRoomSeode,
                    SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4)
                ORDER BY 
                    b.DIMDataTypeSubRoomSeode,
                    SUBSTRING(t.DimTimeTypesDetailDesc, 1, 4)
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                if (!string.IsNullOrEmpty(groupName))
                    cmd.Parameters.AddWithValue("@groupName", groupName);

                if (deptIdValue.HasValue)
                    cmd.Parameters.AddWithValue("@deptId", deptIdValue.Value);


                List<ChargingDataRow> allRows = new List<ChargingDataRow>();
                Dictionary<string, List<ChargingDataRow>> groupedByDept = new Dictionary<string, List<ChargingDataRow>>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        ChargingDataRow row = new ChargingDataRow();
                        row.Department = reader["Department"] != DBNull.Value ? reader["Department"].ToString() : "";
                        row.Year = reader["Year"] != DBNull.Value ? reader["Year"].ToString() : "";
                        row.TotalQ = reader["TotalQ"] != DBNull.Value ? Convert.ToInt32(reader["TotalQ"]) : 0;
                        row.TotalCharging = reader["TotalCharging"] != DBNull.Value ? Convert.ToInt32(reader["TotalCharging"]) : 0;
                        row.ChangePercent = null;

                        if (!groupedByDept.ContainsKey(row.Department))
                        {
                            groupedByDept[row.Department] = new List<ChargingDataRow>();
                        }

                        groupedByDept[row.Department].Add(row);
                    }
                }


                foreach (var dept in groupedByDept.Keys)
                {
                    List<ChargingDataRow> list = groupedByDept[dept];
                    list.Sort((a, b) => string.Compare(a.Year, b.Year, StringComparison.Ordinal));

                    for (int i = 0; i < list.Count; i++)
                    {
                        if (i == 0)
                        {
                            list[i].ChangePercent = null;
                        }
                        else
                        {
                            double current = list[i].TotalCharging;
                            double previous = list[i - 1].TotalCharging;

                            if (previous == 0)
                            {
                                list[i].ChangePercent = "N/A";
                            }
                            else
                            {
                                double percent = ((current - previous) / previous) * 100.0;
                                string formatted = (percent > 0 ? "+" : percent < 0 ? "-" : "") + Math.Abs(percent).ToString("0.0") + "%";
                                list[i].ChangePercent = formatted;
                            }
                        }

                        allRows.Add(list[i]);
                    }
                }

                return JsonConvert.SerializeObject(allRows);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { error = ex.Message });
            }
        }
    }


    public class ChargingDataRow
    {
        public string Department { get; set; }
        public string Year { get; set; }
        public int TotalQ { get; set; }
        public int TotalCharging { get; set; }
        public string ChangePercent { get; set; }
    }


    public string GetChargingIncomeTrends(string groupId, string deptId, string incomeCategory)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
            ;WITH BaseData AS (
                SELECT 
                    b1.DIMDataTypeSubRoomSeode  AS GroupName,
                    b1.DIMDataTypeSubID         AS GroupID,
                    b2.DIMDataTypeSubDescSeode  AS DeptName,
                    b2.DIMDataTypeSubID         AS DeptID,
                    LEFT(t.aliasName, 4)        AS [Year],
                    SUM(a.Charging)             AS TotalCharging,
                    SUM(a.Govrament)            AS TotalGovrament,
                    SUM(a.Tagid)                AS TotalTagid,
                    SUM(a.Other)                AS TotalOther
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b 
                    ON b.DIMDataTypeSubID = a.DIMDataTypeSubID AND b.DIMDataTypeID = 13
                INNER JOIN (
                    SELECT DIMDataTypeSubRoomSeode, MIN(DIMDataTypeSubID) AS DIMDataTypeSubID
                    FROM DW_DataTypesSub WHERE DIMDataTypeID = 13
                    GROUP BY DIMDataTypeSubRoomSeode
                ) b1 ON b.DIMDataTypeSubRoomSeode = b1.DIMDataTypeSubRoomSeode
                INNER JOIN (
                    SELECT DIMDataTypeSubDescSeode, MIN(DIMDataTypeSubID) AS DIMDataTypeSubID
                    FROM DW_DataTypesSub WHERE DIMDataTypeID = 13
                    GROUP BY DIMDataTypeSubDescSeode
                ) b2 ON b.DIMDataTypeSubDescSeode = b2.DIMDataTypeSubDescSeode
                INNER JOIN DW_DimTimeTypesDetails t 
                    ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID AND t.DimTimeTypeID = 7
                WHERE 
                    (@groupId IS NULL OR b1.DIMDataTypeSubID = @groupId)
                    AND (@deptId IS NULL OR b2.DIMDataTypeSubID = @deptId)
                GROUP BY 
                    b1.DIMDataTypeSubRoomSeode, b1.DIMDataTypeSubID,
                    b2.DIMDataTypeSubDescSeode, b2.DIMDataTypeSubID,
                    LEFT(t.aliasName, 4)
            ),
            Ranked AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY DeptID ORDER BY [Year]) AS RowNum
                FROM BaseData
            ),
            Joined AS (
                SELECT 
                    curr.*, 
                    prev.TotalCharging AS PrevCharging,
                    prev.TotalGovrament AS PrevGovrament,
                    prev.TotalTagid AS PrevTagid,
                    prev.TotalOther AS PrevOther
                FROM Ranked curr
                LEFT JOIN Ranked prev 
                    ON curr.DeptID = prev.DeptID AND curr.RowNum = prev.RowNum + 1
            )
            SELECT * FROM Joined
            ORDER BY DeptID, CAST([Year] AS INT);
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);
                int val;

                if (!string.IsNullOrEmpty(groupId) && int.TryParse(groupId, out val))
                    cmd.Parameters.AddWithValue("@groupId", val);
                else
                    cmd.Parameters.AddWithValue("@groupId", DBNull.Value);

                if (!string.IsNullOrEmpty(deptId) && int.TryParse(deptId, out val))
                    cmd.Parameters.AddWithValue("@deptId", val);
                else
                    cmd.Parameters.AddWithValue("@deptId", DBNull.Value);

                var resultList = new List<Dictionary<string, object>>();
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var row = new Dictionary<string, object>();

                        string[] allFields = new string[]
                        {
                        "GroupName", "GroupID", "DeptName", "DeptID", "Year",
                        "TotalCharging", "PrevCharging",
                        "TotalGovrament", "PrevGovrament",
                        "TotalTagid", "PrevTagid",
                        "TotalOther", "PrevOther"
                        };

                        foreach (string field in allFields)
                        {
                            row[field] = reader[field] != DBNull.Value ? reader[field] : null;
                        }

                        // Add calculated values
                        if (incomeCategory == null || incomeCategory == "totalCharging")
                        {
                            row["ChargingDiff"] = (row["TotalCharging"] != null && row["PrevCharging"] != null)
                                ? Convert.ToDecimal(row["TotalCharging"]) - Convert.ToDecimal(row["PrevCharging"])
                                : (decimal?)null;

                            row["ChargingPct"] = (row["TotalCharging"] != null && row["PrevCharging"] != null && Convert.ToDecimal(row["PrevCharging"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalCharging"]) - Convert.ToDecimal(row["PrevCharging"])) * 100 / Convert.ToDecimal(row["PrevCharging"]), 1)
                                : (decimal?)null;
                        }

                        if (incomeCategory == null || incomeCategory == "totalGovrament")
                        {
                            row["GovramentDiff"] = (row["TotalGovrament"] != null && row["PrevGovrament"] != null)
                                ? Convert.ToDecimal(row["TotalGovrament"]) - Convert.ToDecimal(row["PrevGovrament"])
                                : (decimal?)null;

                            row["GovramentPct"] = (row["TotalGovrament"] != null && row["PrevGovrament"] != null && Convert.ToDecimal(row["PrevGovrament"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalGovrament"]) - Convert.ToDecimal(row["PrevGovrament"])) * 100 / Convert.ToDecimal(row["PrevGovrament"]), 1)
                                : (decimal?)null;
                        }

                        if (incomeCategory == null || incomeCategory == "totalTagid")
                        {
                            row["TagidDiff"] = (row["TotalTagid"] != null && row["PrevTagid"] != null)
                                ? Convert.ToDecimal(row["TotalTagid"]) - Convert.ToDecimal(row["PrevTagid"])
                                : (decimal?)null;

                            row["TagidPct"] = (row["TotalTagid"] != null && row["PrevTagid"] != null && Convert.ToDecimal(row["PrevTagid"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalTagid"]) - Convert.ToDecimal(row["PrevTagid"])) * 100 / Convert.ToDecimal(row["PrevTagid"]), 1)
                                : (decimal?)null;
                        }

                        if (incomeCategory == null || incomeCategory == "totalOther")
                        {
                            row["OtherDiff"] = (row["TotalOther"] != null && row["PrevOther"] != null)
                                ? Convert.ToDecimal(row["TotalOther"]) - Convert.ToDecimal(row["PrevOther"])
                                : (decimal?)null;

                            row["OtherPct"] = (row["TotalOther"] != null && row["PrevOther"] != null && Convert.ToDecimal(row["PrevOther"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalOther"]) - Convert.ToDecimal(row["PrevOther"])) * 100 / Convert.ToDecimal(row["PrevOther"]), 1)
                                : (decimal?)null;
                        }

                        // Filter output to only include requested category if needed
                        if (!string.IsNullOrEmpty(incomeCategory))
                        {
                            var keysToKeep = new List<string>
                        {
                            "GroupName", "GroupID", "DeptName", "DeptID", "Year"
                        };

                            if (incomeCategory == "totalCharging") keysToKeep.AddRange(new[] { "TotalCharging", "ChargingDiff", "ChargingPct" });
                            if (incomeCategory == "totalGovrament") keysToKeep.AddRange(new[] { "TotalGovrament", "GovramentDiff", "GovramentPct" });
                            if (incomeCategory == "totalTagid") keysToKeep.AddRange(new[] { "TotalTagid", "TagidDiff", "TagidPct" });
                            if (incomeCategory == "totalOther") keysToKeep.AddRange(new[] { "TotalOther", "OtherDiff", "OtherPct" });

                            var filteredRow = new Dictionary<string, object>();
                            foreach (var key in keysToKeep)
                            {
                                if (row.ContainsKey(key)) filteredRow[key] = row[key];
                            }
                            resultList.Add(filteredRow);
                        }
                        else
                        {
                            resultList.Add(row);
                        }
                    }
                }

                return JsonConvert.SerializeObject(resultList);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { error = ex.Message });
            }
        }


    }


    public string GetChargingIncomeMonthlyTrendsFull(string groupId, string deptId, string incomeCategory)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT DISTINCT 
                    b1.DIMDataTypeSubRoomSeode AS GroupName,
                    b1.DIMDataTypeSubID AS GroupID,
                    b2.DIMDataTypeSubDescSeode AS DeptName,
                    b2.DIMDataTypeSubID AS DeptID,
                    t.aliasName AS YearAlias,
                    SUM(a.Charging) AS TotalCharging,
                    SUM(a.Govrament) AS TotalGovrament,
                    SUM(a.Tagid) AS TotalTagid,
                    SUM(a.Other) AS TotalOther
                FROM DW_AggregationChargingDepartments a
                INNER JOIN DW_DataTypesSub b 
                    ON b.DIMDataTypeSubID = a.DIMDataTypeSubID 
                    AND b.DIMDataTypeID = 13
                INNER JOIN (
                    SELECT DIMDataTypeSubRoomSeode, MIN(DIMDataTypeSubID) AS DIMDataTypeSubID
                    FROM DW_DataTypesSub
                    WHERE DIMDataTypeID = 13
                    GROUP BY DIMDataTypeSubRoomSeode
                ) b1 ON b.DIMDataTypeSubRoomSeode = b1.DIMDataTypeSubRoomSeode
                INNER JOIN (
                    SELECT DIMDataTypeSubDescSeode, MIN(DIMDataTypeSubID) AS DIMDataTypeSubID
                    FROM DW_DataTypesSub
                    WHERE DIMDataTypeID = 13
                    GROUP BY DIMDataTypeSubDescSeode
                ) b2 ON b.DIMDataTypeSubDescSeode = b2.DIMDataTypeSubDescSeode
                INNER JOIN DW_DimTimeTypesDetails t 
                    ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID 
                    AND t.DimTimeTypeID = 7
                WHERE 
                    (@groupId IS NULL OR b1.DIMDataTypeSubID = @groupId)
                    AND (@deptId IS NULL OR b2.DIMDataTypeSubID = @deptId)
                GROUP BY 
                    b1.DIMDataTypeSubRoomSeode,
                    b1.DIMDataTypeSubID,
                    b2.DIMDataTypeSubDescSeode,
                    b2.DIMDataTypeSubID,
                    t.aliasName
                ORDER BY 
                    b1.DIMDataTypeSubRoomSeode,
                    b2.DIMDataTypeSubDescSeode,
                    t.aliasName;
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                // Convert groupId and deptId to integer if not null, otherwise set them to DBNull
                if (!string.IsNullOrEmpty(groupId))
                {
                    cmd.Parameters.AddWithValue("@groupId", Convert.ToInt32(groupId));
                }
                else
                {
                    cmd.Parameters.AddWithValue("@groupId", DBNull.Value);
                }

                if (!string.IsNullOrEmpty(deptId))
                {
                    cmd.Parameters.AddWithValue("@deptId", Convert.ToInt32(deptId));
                }
                else
                {
                    cmd.Parameters.AddWithValue("@deptId", DBNull.Value);
                }

                var resultList = new List<Dictionary<string, object>>();
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var row = new Dictionary<string, object>();

                        // Fields that exist in the SQL query result set
                        string[] allFields = new string[]
                        {
                        "GroupName", "GroupID", "DeptName", "DeptID", "YearAlias",
                        "TotalCharging", "TotalGovrament", "TotalTagid", "TotalOther"
                        };

                        // Read and add fields to the dictionary
                        foreach (string field in allFields)
                        {
                            row[field] = reader[field] != DBNull.Value ? reader[field] : null;
                        }

                        // Add calculated values for the requested category
                        if (incomeCategory == null || incomeCategory == "totalCharging")
                        {
                            row["ChargingDiff"] = (row["TotalCharging"] != null)
                                ? Convert.ToDecimal(row["TotalCharging"]) // No comparison with previous month
                                : (decimal?)null;

                            row["ChargingPct"] = (row["TotalCharging"] != null && Convert.ToDecimal(row["TotalCharging"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalCharging"])) * 100 / Convert.ToDecimal(row["TotalCharging"]), 1)
                                : (decimal?)null;
                        }

                        if (incomeCategory == null || incomeCategory == "totalGovrament")
                        {
                            row["GovramentDiff"] = (row["TotalGovrament"] != null)
                                ? Convert.ToDecimal(row["TotalGovrament"])
                                : (decimal?)null;

                            row["GovramentPct"] = (row["TotalGovrament"] != null && Convert.ToDecimal(row["TotalGovrament"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalGovrament"])) * 100 / Convert.ToDecimal(row["TotalGovrament"]), 1)
                                : (decimal?)null;
                        }

                        if (incomeCategory == null || incomeCategory == "totalTagid")
                        {
                            row["TagidDiff"] = (row["TotalTagid"] != null)
                                ? Convert.ToDecimal(row["TotalTagid"])
                                : (decimal?)null;

                            row["TagidPct"] = (row["TotalTagid"] != null && Convert.ToDecimal(row["TotalTagid"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalTagid"])) * 100 / Convert.ToDecimal(row["TotalTagid"]), 1)
                                : (decimal?)null;
                        }

                        if (incomeCategory == null || incomeCategory == "totalOther")
                        {
                            row["OtherDiff"] = (row["TotalOther"] != null)
                                ? Convert.ToDecimal(row["TotalOther"])
                                : (decimal?)null;

                            row["OtherPct"] = (row["TotalOther"] != null && Convert.ToDecimal(row["TotalOther"]) != 0)
                                ? Math.Round((Convert.ToDecimal(row["TotalOther"])) * 100 / Convert.ToDecimal(row["TotalOther"]), 1)
                                : (decimal?)null;
                        }

                        // Filter output to only include requested category if needed
                        if (!string.IsNullOrEmpty(incomeCategory))
                        {
                            var keysToKeep = new List<string>
                        {
                            "GroupName", "GroupID", "DeptName", "DeptID", "YearAlias"
                        };

                            if (incomeCategory == "totalCharging") keysToKeep.AddRange(new[] { "TotalCharging", "ChargingDiff", "ChargingPct" });
                            if (incomeCategory == "totalGovrament") keysToKeep.AddRange(new[] { "TotalGovrament", "GovramentDiff", "GovramentPct" });
                            if (incomeCategory == "totalTagid") keysToKeep.AddRange(new[] { "TotalTagid", "TagidDiff", "TagidPct" });
                            if (incomeCategory == "totalOther") keysToKeep.AddRange(new[] { "TotalOther", "OtherDiff", "OtherPct" });

                            var filteredRow = new Dictionary<string, object>();
                            foreach (var key in keysToKeep)
                            {
                                if (row.ContainsKey(key)) filteredRow[key] = row[key];
                            }
                            resultList.Add(filteredRow);
                        }
                        else
                        {
                            resultList.Add(row);
                        }
                    }
                }

                return JsonConvert.SerializeObject(resultList);
            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(new { error = ex.Message });
            }
        }
    }

    public string GetChargingIncomeMonthlyTrends(string groupId, string deptId, string incomeCategory)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
            SELECT DISTINCT 
                t.aliasName AS YearAlias,
                SUM(a.Charging) AS TotalCharging,
                COUNT(a.DIMDataTypeSubID) AS Quantity
            FROM DW_AggregationChargingDepartments a
            INNER JOIN DW_DataTypesSub b 
                ON b.DIMDataTypeSubID = a.DIMDataTypeSubID 
                AND b.DIMDataTypeID = 13
            INNER JOIN (
                SELECT DIMDataTypeSubRoomSeode, MIN(DIMDataTypeSubID) AS DIMDataTypeSubID
                FROM DW_DataTypesSub
                WHERE DIMDataTypeID = 13
                GROUP BY DIMDataTypeSubRoomSeode
            ) b1 ON b.DIMDataTypeSubRoomSeode = b1.DIMDataTypeSubRoomSeode
            INNER JOIN (
                SELECT DIMDataTypeSubDescSeode, MIN(DIMDataTypeSubID) AS DIMDataTypeSubID
                FROM DW_DataTypesSub
                WHERE DIMDataTypeID = 13
                GROUP BY DIMDataTypeSubDescSeode
            ) b2 ON b.DIMDataTypeSubDescSeode = b2.DIMDataTypeSubDescSeode
            INNER JOIN DW_DimTimeTypesDetails t 
                ON a.DimTimeTypesDetailID = t.DimTimeTypesDetailID 
                AND t.DimTimeTypeID = 7
            WHERE 
                (@groupId IS NULL OR b1.DIMDataTypeSubID = @groupId)
                AND (@deptId IS NULL OR b2.DIMDataTypeSubID = @deptId)
            GROUP BY t.aliasName
            ORDER BY t.aliasName;
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                // Convert groupId and deptId to integer if not null, otherwise set them to DBNull
                if (!string.IsNullOrEmpty(groupId))
                {
                    cmd.Parameters.AddWithValue("@groupId", Convert.ToInt32(groupId));
                }
                else
                {
                    cmd.Parameters.AddWithValue("@groupId", DBNull.Value);
                }

                if (!string.IsNullOrEmpty(deptId))
                {
                    cmd.Parameters.AddWithValue("@deptId", Convert.ToInt32(deptId));
                }
                else
                {
                    cmd.Parameters.AddWithValue("@deptId", DBNull.Value);
                }

                var resultList = new List<List<object>>();
                resultList.Add(new List<object> { "Month", "Charging", "Quantity" }); // Header row with Month first

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        // Prepare each row with 'Month', 'Charging', and 'Quantity' (Month first)
                        string yearAlias = reader["YearAlias"] != DBNull.Value ? reader["YearAlias"].ToString() : string.Empty;
                        decimal totalCharging = reader["TotalCharging"] != DBNull.Value ? Convert.ToDecimal(reader["TotalCharging"]) : 0;
                        int quantity = reader["Quantity"] != DBNull.Value ? Convert.ToInt32(reader["Quantity"]) : 0;

                        // Add the row for the chart data (Month first)
                        resultList.Add(new List<object> { yearAlias, totalCharging, quantity });
                    }
                }

                var result = new Dictionary<string, object>();
                result.Add("success", true);
                result.Add("total", resultList.Count - 1); // Exclude the header row
                result.Add("data", resultList);

                return JsonConvert.SerializeObject(result);
            }
            catch (Exception ex)
            {
                var errorResult = new Dictionary<string, object>();
                errorResult.Add("success", false);
                errorResult.Add("error", ex.Message);
                return JsonConvert.SerializeObject(errorResult);
            }
        }
    }



    public string GetPicDetailedDataEx()
    {
        DateTime today = DateTime.Today;
        DateTime startOfPreviousMonth = new DateTime(today.Year, today.Month, 1).AddMonths(-1);
        DateTime endDate = today;


        Dictionary<string, string> caseToDrgDesc = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            conn.Open();
            SqlCommand cmd = new SqlCommand("SP_MR_PCI", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@FromDate", startOfPreviousMonth);
            cmd.Parameters.AddWithValue("@ToDate", endDate);

            SqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                if (!reader.IsDBNull(0) && !reader.IsDBNull(3))
                {
                    string caseNumber = reader.GetString(0);
                    string desc = reader.GetString(3);
                    if (!caseToDrgDesc.ContainsKey(caseNumber))
                    {
                        caseToDrgDesc.Add(caseNumber, desc);
                    }
                }
            }
            reader.Close();
        }


        List<Dictionary<string, object>> columns = BuildChartColumns();
        columns.Add(BuildChartColumn("drg_doc_desc_kabala", "תיאור", "string"));


        List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
        HashSet<string> uniqueKeys = new HashSet<string>();

        string pciQuery = @"
        SELECT 
            p.SF_CASE,
            PatientNumber,
            p.SF_DATE, 
            p.SF_TEROOM, 
            p.SF_TIME, 
            p.RoomNumber,
            p.SF_ENDCUT, 
            p.SF_EXROOM, 
            p.DocName           
        FROM dbo.PCI p
        LEFT JOIN [NAMER].[dbo].[SurgeriesRealTime] s
            ON p.SF_CASE = s.CaseNumber
        WHERE 
            p.SF_DATE >= @startDate AND p.SF_DATE <= @endDate
			AND DepartName LIKE N'%קרדיולוגיה%'
        ORDER BY p.SF_DATE";

        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            conn.Open();
            SqlCommand cmd = new SqlCommand(pciQuery, conn);
            cmd.Parameters.AddWithValue("@startDate", startOfPreviousMonth);
            cmd.Parameters.AddWithValue("@endDate", endDate);

            SqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                string caseNumber = reader["SF_CASE"] != DBNull.Value ? reader["SF_CASE"].ToString() : "";
                string key = BuildRowDedupKey(reader);
                if (uniqueKeys.Contains(key)) continue;
                uniqueKeys.Add(key);

                List<Dictionary<string, object>> cells = BuildChartRowCells(reader);
                string drgDesc = caseToDrgDesc.ContainsKey(caseNumber) ? caseToDrgDesc[caseNumber] : "";
                cells.Add(BuildChartCell(drgDesc));

                Dictionary<string, object> row = new Dictionary<string, object>();
                row.Add("c", cells);
                rows.Add(row);
            }
            reader.Close();
        }

        Dictionary<string, object> chartTable = new Dictionary<string, object>();
        chartTable.Add("cols", columns);
        chartTable.Add("rows", rows);

        return JsonConvert.SerializeObject(chartTable);
    }


    private List<Dictionary<string, object>> BuildChartRowCells(SqlDataReader reader)
    {
        List<Dictionary<string, object>> cells = new List<Dictionary<string, object>>();

        cells.Add(BuildChartCell(reader, "SF_CASE"));
        cells.Add(BuildChartCell(reader, "PatientNumber"));
        cells.Add(BuildChartDateCell(reader, "SF_DATE"));
        cells.Add(BuildChartCell(reader, "SF_TEROOM"));
        cells.Add(BuildChartCell(reader, "SF_TIME"));
        cells.Add(BuildChartCell(reader, "RoomNumber"));
        cells.Add(BuildChartCell(reader, "SF_ENDCUT"));
        cells.Add(BuildChartCell(reader, "SF_EXROOM"));
        cells.Add(BuildChartCell(reader, "DocName"));
        return cells;
    }

    private List<Dictionary<string, object>> BuildChartColumns()
    {
        List<Dictionary<string, object>> cols = new List<Dictionary<string, object>>();

        cols.Add(BuildChartColumn("sf_case", "מקרה", "string"));
        cols.Add(BuildChartColumn("patientnumber", "מספר מטופל", "string"));
        cols.Add(BuildChartColumn("sf_date", "תאריך", "date"));
        cols.Add(BuildChartColumn("sf_teroom", "שעת התחלה", "string"));
        cols.Add(BuildChartColumn("sf_time", "שעת סיום", "string"));
        cols.Add(BuildChartColumn("room_number", "מספר חדר", "string"));
        cols.Add(BuildChartColumn("sf_endcut", "סיום חתך", "date"));
        cols.Add(BuildChartColumn("sf_exroom", "שעת יציאה", "string"));
        cols.Add(BuildChartColumn("doc_name", "שם רופא", "string"));
        return cols;
    }

    private string BuildRowDedupKey(SqlDataReader reader)
    {
        string caseNumber = reader["SF_CASE"] != DBNull.Value ? reader["SF_CASE"].ToString() : "";
        string date = reader["SF_DATE"] != DBNull.Value ? Convert.ToDateTime(reader["SF_DATE"]).ToString("yyyy-MM-dd") : "";
        string time = reader["SF_TEROOM"] != DBNull.Value ? reader["SF_TEROOM"].ToString() : "";
        return caseNumber + "_" + date + "_" + time;
    }


    private Dictionary<string, object> BuildChartCell(SqlDataReader reader, string columnName)
    {
        object value = reader[columnName];
        Dictionary<string, object> cell = new Dictionary<string, object>();
        cell.Add("v", value != DBNull.Value ? value.ToString() : "");
        return cell;
    }

    private Dictionary<string, object> BuildChartCell(string value)
    {
        Dictionary<string, object> cell = new Dictionary<string, object>();
        cell.Add("v", value);
        return cell;
    }

    private Dictionary<string, object> BuildChartDateCell(SqlDataReader reader, string columnName)
    {
        object value = reader[columnName];
        string formatted = "";

        if (value != DBNull.Value)
        {
            DateTime dt = Convert.ToDateTime(value);
            formatted = dt.ToString("yyyy-MM-dd");
        }

        Dictionary<string, object> cell = new Dictionary<string, object>();
        cell.Add("v", formatted);
        return cell;
    }



    private Dictionary<string, object> BuildChartColumn(string id, string label, string type)
    {
        Dictionary<string, object> column = new Dictionary<string, object>();
        column.Add("id", id);
        column.Add("label", label);
        column.Add("type", type);
        return column;
    }


    public string GetPicDetailedDataExCombined(int dparam = 0)
    {
        DateTime today = DateTime.Today;
        DateTime startOfPreviousMonth = new DateTime(today.Year, today.Month, 1).AddMonths(-1);
        DateTime endDate = today;

        Dictionary<string, string> caseToDrgDesc = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            conn.Open();
            SqlCommand cmd = new SqlCommand("SP_MR_PCI", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@FromDate", startOfPreviousMonth);
            cmd.Parameters.AddWithValue("@ToDate", endDate);

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    if (!reader.IsDBNull(0) && !reader.IsDBNull(3))
                    {
                        string caseNumber = reader.GetString(0);
                        string desc = reader.GetString(3);
                        if (!caseToDrgDesc.ContainsKey(caseNumber))
                        {
                            caseToDrgDesc.Add(caseNumber, desc);
                        }
                    }
                }
            }
        }

        List<Dictionary<string, object>> columns = BuildChartColumns();
        columns.Add(BuildChartColumn("drg_doc_desc_kabala", "תיאור", "string"));

        List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
        HashSet<string> uniqueKeys = new HashSet<string>();

        // Apply filter based on param value
        string departmentFilter;

        switch (dparam)
        {
            case 1:
                departmentFilter = "DepartName LIKE N'%צנתורי מח%'";
                break;
            default:
                departmentFilter = "DepartName LIKE N'%קרדיולוגיה%'";
                break;
        }

        string pciQuery =
            "SELECT " +
            "    p.SF_CASE, " +
            "    PatientNumber, " +
            "    p.SF_DATE, " +
            "    p.SF_TEROOM, " +
            "    p.SF_TIME, " +
            "    p.RoomNumber, " +
            "    p.SF_ENDCUT, " +
            "    p.SF_EXROOM, " +
            "    p.DocName " +
            "FROM dbo.PCI p WITH (NOLOCK) " +
            "LEFT JOIN [NAMER].[dbo].[SurgeriesRealTime] s WITH (NOLOCK) " +
            "    ON p.SF_CASE = s.CaseNumber " +
            "WHERE " +
            "    p.SF_DATE >= @startDate AND p.SF_DATE <= @endDate AND " +
                 departmentFilter + " " +
            "ORDER BY p.SF_DATE";



        using (SqlConnection conn = new SqlConnection(connetionStringNAMER))
        {
            conn.Open();
            SqlCommand cmd = new SqlCommand(pciQuery, conn);
            cmd.Parameters.AddWithValue("@startDate", startOfPreviousMonth);
            cmd.Parameters.AddWithValue("@endDate", endDate);

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string caseNumber = reader["SF_CASE"] != DBNull.Value ? reader["SF_CASE"].ToString() : "";
                    string key = BuildRowDedupKey(reader);
                    if (uniqueKeys.Contains(key)) continue;
                    uniqueKeys.Add(key);

                    List<Dictionary<string, object>> cells = BuildChartRowCells(reader);
                    string drgDesc = caseToDrgDesc.ContainsKey(caseNumber) ? caseToDrgDesc[caseNumber] : "";
                    cells.Add(BuildChartCell(drgDesc));

                    rows.Add(new Dictionary<string, object> { { "c", cells } });
                }
            }
        }

        var chartTable = new Dictionary<string, object>
    {
        { "cols", columns },
        { "rows", rows }
    };

        return JsonConvert.SerializeObject(chartTable);
    }


    public string IncomeDataByYearCombined(int dparam = 0)
    {
        using (SqlConnection cnn1 = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn1.Open();

                string baseTableName = "CH_Income";
                if (dparam == 1)
                {
                    baseTableName += "Brain";
                }

                string cmdString = string.Format(@"
                SELECT 
                    year,
                    month,
                    MonthlySummarizedValue
                FROM {0}
                WHERE MonthlySummarizedValue IS NOT NULL
                ORDER BY year, month", baseTableName);

                SqlCommand cmd = new SqlCommand(cmdString, cnn1);
                cmd.CommandType = System.Data.CommandType.Text;

                List<IncomeRecord> rawData = new List<IncomeRecord>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        rawData.Add(new IncomeRecord
                        {
                            Year = Convert.ToInt32(reader["year"]),
                            Month = Convert.ToInt32(reader["month"]),
                            Value = Convert.ToDecimal(reader["MonthlySummarizedValue"])
                        });
                    }
                }

                string[] hebrewMonths = new string[]
                {
                "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
                };

                var yData = (
                    from record in rawData
                    group record by record.Year into yearGroup
                    orderby yearGroup.Key
                    select new Dictionary<string, object>
                    {
                    { "Year", new Dictionary<string, object>
                        {
                            { "value", yearGroup.Key },
                            { "Months", (
                                from m in yearGroup
                                orderby m.Month
                                select new Dictionary<string, object>
                                {
                                    { "name", hebrewMonths[m.Month - 1] },
                                    { "y", m.Value }
                                }).ToList()
                            }
                        }
                    }
                    }).ToList();

                var result = new Dictionary<string, object>
            {
                { "yData", yData }
            };

                return JsonConvert.SerializeObject(result);
            }
            catch (Exception e)
            {
                Console.WriteLine("Error in IncomeDataByYearCombined: " + e.Message);
                return JsonConvert.SerializeObject(new { yData = new List<object>() });
            }
        }
    }



    public string ExploitationCombined(int dparam = 0)
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);
        var result = new
        {
            cols = new List<object>
        {
            new { id = "A", label = "Year", type = "string" },
            new { id = "B", label = "בוקר", type = "number" },
            new { id = "C", label = "ססיות", type = "number" },
            new { id = "D", label = "דחופים, לילה, סופ׳ש", type = "number" }
        },
            rows = new List<object>()
        };

        try
        {
            cnn.Open();

            string baseTableName = "CH_ProceduresbyType";
            if (dparam == 1)
            {
                baseTableName += "Brain";
            }

            string query = string.Format(@"
            SELECT 
                year,
                [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                SUM(MonthlySummarizedValue) AS TotalValue
            FROM {0}
            GROUP BY year, [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
            ORDER BY year", baseTableName);

            SqlCommand cmd = new SqlCommand(query, cnn);

            Dictionary<int, Dictionary<string, decimal>> data = new Dictionary<int, Dictionary<string, decimal>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int year = Convert.ToInt32(reader["year"]);
                    string surgeryType = reader["SurgeryType"].ToString();
                    decimal value = Convert.ToDecimal(reader["TotalValue"]);

                    if (!data.ContainsKey(year))
                        data[year] = new Dictionary<string, decimal>();

                    data[year][surgeryType] = value;
                }
            }

            foreach (var yearEntry in data.OrderBy(d => d.Key))
            {
                int year = yearEntry.Key;
                Dictionary<string, decimal> surgeryTypes = yearEntry.Value;

                result.rows.Add(new
                {
                    c = new List<object>
                {
                    new { v = year },
                    new { v = surgeryTypes.ContainsKey("אלקטיבי") ? surgeryTypes["אלקטיבי"] : 0 },
                    new { v = surgeryTypes.ContainsKey("ססיה") ? surgeryTypes["ססיה"] : 0 },
                    new { v = surgeryTypes.ContainsKey("דחוף") ? surgeryTypes["דחוף"] : 0 }
                }
                });
            }

            cnn.Close();

            return JsonConvert.SerializeObject(result, Formatting.Indented);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error in GetProceduresSummary: " + ex.Message);
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }


    public string ExploitationMonthlyCombined(int dparam = 0)
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);

        var result = new
        {
            cols = new List<object>
        {
            new { id = "month", label = "חודש", type = "string" },
            new { id = "elective", label = "בוקר", type = "number" },
            new { id = "session", label = "ססיות", type = "number" },
            new { id = "urgent", label = "דחופים, לילה, סופ׳ש", type = "number" }
        },
            rows = new List<object>()
        };

        try
        {
            cnn.Open();

            DateTime today = DateTime.Today;
            DateTime endMonth = new DateTime(today.Year, today.Month, 1).AddDays(-1);
            DateTime startMonth = endMonth.AddMonths(-35);

            int startYear = startMonth.Year;
            int startMonthNum = startMonth.Month;
            int endYear = endMonth.Year;
            int endMonthNum = endMonth.Month;

            string tableName = "CH_ProceduresbyType";
            if (dparam == 1)
            {
                tableName += "Brain";
            }

            string query = string.Format(@"
            SELECT 
                [year],
                [month],
                [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                SUM(MonthlySummarizedValue) AS TotalValue
            FROM {0}
            WHERE 
                ([year] > @startYear OR ([year] = @startYear AND [month] >= @startMonth))
                AND
                ([year] < @endYear OR ([year] = @endYear AND [month] <= @endMonth))
            GROUP BY [year], [month], [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
            ORDER BY [year], [month]", tableName);

            SqlCommand cmd = new SqlCommand(query, cnn);
            cmd.Parameters.AddWithValue("@startYear", startYear);
            cmd.Parameters.AddWithValue("@startMonth", startMonthNum);
            cmd.Parameters.AddWithValue("@endYear", endYear);
            cmd.Parameters.AddWithValue("@endMonth", endMonthNum);

            Dictionary<string, Dictionary<string, decimal>> data = new Dictionary<string, Dictionary<string, decimal>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    int year = Convert.ToInt32(reader["year"]);
                    int month = Convert.ToInt32(reader["month"]);
                    string key = string.Format("{0}-{1:D2}", year, month);

                    string type = reader["SurgeryType"].ToString();
                    decimal value = Convert.ToDecimal(reader["TotalValue"]);

                    if (!data.ContainsKey(key))
                    {
                        data[key] = new Dictionary<string, decimal>();
                    }

                    data[key][type] = value;
                }
            }

            foreach (var kvp in data.OrderBy(k => k.Key))
            {
                string monthLabel = kvp.Key;
                Dictionary<string, decimal> types = kvp.Value;

                result.rows.Add(new
                {
                    c = new List<object>
                {
                    new { v = monthLabel },
                    new { v = types.ContainsKey("אלקטיבי") ? types["אלקטיבי"] : 0 },
                    new { v = types.ContainsKey("ססיה") ? types["ססיה"] : 0 },
                    new { v = types.ContainsKey("דחוף") ? types["דחוף"] : 0 }
                }
                });
            }

            cnn.Close();
            return JsonConvert.SerializeObject(result, Formatting.Indented);
        }
        catch (Exception ex)
        {
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }


    public string ExploitationWeeklyCombined(int dparam = 0)
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);

        var result = new
        {
            cols = new List<object>
        {
            new { id = "A", label = "שבוע", type = "string" },
            new { id = "B", label = "אלקטיבי", type = "number" },
            new { id = "C", label = "ססיה", type = "number" },
            new { id = "D", label = "דחוף", type = "number" }
        },
            rows = new List<object>()
        };

        try
        {
            cnn.Open();

            DateTime now = DateTime.Today;
            DateTime firstDayOfMonth = new DateTime(now.Year, now.Month, 1);
            DateTime startDate = firstDayOfMonth;
            DateTime endDate = firstDayOfMonth.AddMonths(1);

            if ((now - firstDayOfMonth).TotalDays < 7)
            {
                startDate = firstDayOfMonth.AddMonths(-1);
                endDate = firstDayOfMonth;
            }

            string tableName = "CH_AData";
            if (dparam == 1)
            {
                tableName += "Brain";
            }

            string query = string.Format(@"
            SELECT 
                DATEPART(YEAR, [תאריך ניתוח]) AS SurgeryYear,
                DATEPART(WEEK, [תאריך ניתוח]) AS SurgeryWeek,
                [סוג ניתוח (דחוף / ססיה / אלקטיבי)] AS SurgeryType,
                COUNT(*) AS Total
            FROM {0}
            WHERE 
                [תאריך ניתוח] >= @startDate AND [תאריך ניתוח] < @endDate
                AND [סוג ניתוח (דחוף / ססיה / אלקטיבי)] IS NOT NULL
            GROUP BY 
                DATEPART(YEAR, [תאריך ניתוח]), 
                DATEPART(WEEK, [תאריך ניתוח]), 
                [סוג ניתוח (דחוף / ססיה / אלקטיבי)]
            ORDER BY SurgeryYear, SurgeryWeek", tableName);

            SqlCommand cmd = new SqlCommand(query, cnn);
            cmd.Parameters.AddWithValue("@startDate", startDate);
            cmd.Parameters.AddWithValue("@endDate", endDate);

            var data = new Dictionary<string, Dictionary<string, int>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string weekLabel = string.Format("שבוע {0}-{1}", reader["SurgeryWeek"], reader["SurgeryYear"]);
                    string surgeryType = reader["SurgeryType"].ToString();
                    int total = Convert.ToInt32(reader["Total"]);

                    if (!data.ContainsKey(weekLabel))
                        data[weekLabel] = new Dictionary<string, int>();

                    data[weekLabel][surgeryType] = total;
                }
            }

            foreach (var week in data.OrderBy(d => d.Key))
            {
                var label = week.Key;
                var types = week.Value;

                result.rows.Add(new
                {
                    c = new List<object>
                {
                    new { v = label },
                    new { v = types.ContainsKey("אלקטיבי") ? types["אלקטיבי"] : 0 },
                    new { v = types.ContainsKey("ססיה") ? types["ססיה"] : 0 },
                    new { v = types.ContainsKey("דחוף") ? types["דחוף"] : 0 }
                }
                });
            }

            cnn.Close();
            return JsonConvert.SerializeObject(result, Formatting.Indented);
        }
        catch (Exception ex)
        {
            return JsonConvert.SerializeObject(new { error = ex.Message });
        }
    }

    public string ProceduresDataByYearCombined(int lastMonthsCount, bool onlyLastMonth, int dparam)
    {
        SqlConnection cnn = new SqlConnection(connetionStringNAMER);
        List<object> YearlyDataList = new List<object>();

        // רשימת רופאים שמגדירה "מוח" (dparam==1)
        string brainDoctorsSql =
            "N'שי.יוספי', " +
            "N'דר'' ערן חיים מאירוביץ''', " +
            "N'אי.מוחמד', " +
            "N'יב.יורצק', " +
            "N'ערן חיים מאירוביץ''', " +
            "N'פרבר יבגני', " +
            "N'מאירוביץ'' ערן חיים', " +
            "N'סקלרנקו יבגני', " +
            "N'מריסאת ענאן' ";

        try
        {
            cnn.Open();

            // --- MTD (מתחילת חודש נוכחי) ---
            if (onlyLastMonth)
            {
                string sourceTable = "PCI";

                string filterSql =
      "AND ( " +
      "  (@dparam = 1 AND LTRIM(RTRIM(DocName)) IN (" + brainDoctorsSql + ")) " +
      "  OR " +
      "  (@dparam <> 1 AND (DocName IS NULL OR LTRIM(RTRIM(DocName)) = '' OR LTRIM(RTRIM(DocName)) NOT IN (" + brainDoctorsSql + "))) " +
      ") ";


                // מחזיר 2 שנים (שנה נוכחית + שנה קודמת) לאותו חודש:
                // כך הקליינט יוכל לחשב יעד ולא ייפול ל-220
                string q =
                    "DECLARE @FromThis date = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1); " +
                    "DECLARE @ToThis   date = CAST(GETDATE() AS date); " +
                    "DECLARE @FromPrev date = DATEADD(YEAR, -1, @FromThis); " +
                    "DECLARE @ToPrev   date = DATEADD(YEAR, -1, @ToThis); " +

                    "SELECT YEAR(@ToThis) AS Y, MONTH(@ToThis) AS M, COUNT(*) AS C " +
                    "FROM " + sourceTable + " " +
                    "WHERE SF_DATE >= @FromThis AND SF_DATE <= @ToThis " + filterSql +
                    "UNION ALL " +
                    "SELECT YEAR(@ToPrev) AS Y, MONTH(@ToPrev) AS M, COUNT(*) AS C " +
                    "FROM " + sourceTable + " " +
                    "WHERE SF_DATE >= @FromPrev AND SF_DATE <= @ToPrev " + filterSql + ";";

                SqlCommand cmd = new SqlCommand(q, cnn);
                cmd.CommandType = System.Data.CommandType.Text;
                cmd.Parameters.Add("@dparam", System.Data.SqlDbType.Int).Value = dparam;

                SqlDataReader r = cmd.ExecuteReader();

                Dictionary<int, List<object>> byYear = new Dictionary<int, List<object>>();
                while (r.Read())
                {
                    int y = Convert.ToInt32(r["Y"]);
                    int m = Convert.ToInt32(r["M"]);

                    decimal c = 0;
                    if (r["C"] != null && r["C"] != DBNull.Value)
                        c = Convert.ToDecimal(r["C"]);

                    List<object> monthsList;
                    if (!byYear.TryGetValue(y, out monthsList))
                    {
                        monthsList = new List<object>();
                        byYear[y] = monthsList;
                    }

                    monthsList.Add(new
                    {
                        name = TranslateMonthNumberToHebrew(m),
                        y = c
                    });
                }

                r.Close();
                cmd.Dispose();

                int thisYear = DateTime.Today.Year;
                int prevYear = thisYear - 1;

                // סדר חשוב לקליינט: שנה קודמת ואז שנה נוכחית
                if (byYear.ContainsKey(prevYear))
                {
                    YearlyDataList.Add(new
                    {
                        Year = new
                        {
                            value = prevYear,
                            Months = byYear[prevYear]
                        }
                    });
                }

                if (byYear.ContainsKey(thisYear))
                {
                    YearlyDataList.Add(new
                    {
                        Year = new
                        {
                            value = thisYear,
                            Months = byYear[thisYear]
                        }
                    });
                }

                if (YearlyDataList.Count == 0)
                    YearlyDataList.Add(new { Year = new { value = 0, Months = new List<object>() } });
            }
            else
            {
                // --- היסטוריה קיימת מהטבלה המסוכמת ---
                string tableName = "CH_ProceduresC";
                if (dparam == 1)
                    tableName = tableName + "Brain";

                string query =
                    "SELECT year, month, MonthlySummarizedValue " +
                    "FROM " + tableName + " " +
                    "ORDER BY year ASC, month ASC";

                SqlCommand cmd = new SqlCommand(query, cnn);
                cmd.CommandType = System.Data.CommandType.Text;

                List<MonthDataExtended> allMonths = new List<MonthDataExtended>();
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    MonthDataExtended m = new MonthDataExtended();
                    m.Year = Convert.ToInt32(reader["year"]);
                    m.MonthNumber = Convert.ToInt32(reader["month"]);
                    m.Value = Convert.ToDecimal(reader["MonthlySummarizedValue"]);
                    allMonths.Add(m);
                }
                reader.Close();
                cmd.Dispose();

                DateTime today = DateTime.Today;

                // חודשים אחרונים (lastMonthsCount) כולל החודש הנוכחי
                List<int> validMonths = new List<int>();
                int monthCursor = today.Month;
                int i = 0;
                while (i < lastMonthsCount)
                {
                    validMonths.Add(monthCursor);
                    monthCursor--;
                    if (monthCursor == 0) monthCursor = 12;
                    i++;
                }
                validMonths.Sort();

                var yearsGroup = allMonths.GroupBy(x => x.Year).OrderBy(g => g.Key);
                foreach (var yearGroup in yearsGroup)
                {
                    var months = yearGroup
                        .Where(x => validMonths.Contains(x.MonthNumber))
                        .OrderBy(x => x.MonthNumber)
                        .ToList();

                    if (months.Count > 0)
                    {
                        List<object> monthsList = new List<object>();
                        foreach (var m in months)
                        {
                            monthsList.Add(new
                            {
                                name = TranslateMonthNumberToHebrew(m.MonthNumber),
                                y = m.Value
                            });
                        }

                        YearlyDataList.Add(new
                        {
                            Year = new
                            {
                                value = yearGroup.Key,
                                Months = monthsList
                            }
                        });
                    }
                }

                if (YearlyDataList.Count == 0)
                    YearlyDataList.Add(new { Year = new { value = 0, Months = new List<object>() } });
            }

            return JsonConvert.SerializeObject(new { yData = YearlyDataList });
        }
        catch (Exception e)
        {
            Console.WriteLine("Error in ProceduresDataByYearCombined: " + e.Message);

            return JsonConvert.SerializeObject(new
            {
                yData = new List<object> { new { Year = new { value = 0, Months = new List<object>() } } }
            });
        }
        finally
        {
            if (cnn.State == System.Data.ConnectionState.Open)
                cnn.Close();
        }
    }



    public class IncomeRecord
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal Value { get; set; }
    }



    public string NBSpecial()
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT [משלם] AS Payer, [מחלקה מחייבת] AS Dept, COUNT(*) AS CountValue
                FROM RoeiAggregationInvoice
                WHERE [כמות קודי חיוב] IN ('G0024','G0026')
                AND [תאריך שחרור] BETWEEN '2024-01-01' AND '2025-05-31'
                GROUP BY [משלם], [מחלקה מחייבת]
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                // Prepare columns
                var cols = new[]
                {
                new Dictionary<string, object> { { "id", "payer" }, { "label", "משלם" }, { "type", "string" } },
                new Dictionary<string, object> { { "id", "dept" }, { "label", "מחלקה מחייבת" }, { "type", "string" } },
                new Dictionary<string, object> { { "id", "count" }, { "label", "ספירה" }, { "type", "number" } }
            };

                // Prepare rows
                var rows = new List<Dictionary<string, object>>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var c = new[]
                        {
                        new Dictionary<string, object> { { "v", reader["Payer"].ToString() } },
                        new Dictionary<string, object> { { "v", reader["Dept"].ToString() } },
                        new Dictionary<string, object> { { "v", Convert.ToInt32(reader["CountValue"]) } }
                    };

                        rows.Add(new Dictionary<string, object> { { "c", c } });
                    }
                }

                var result = new Dictionary<string, object>
            {
                { "cols", cols },
                { "rows", rows }
            };

                return JsonConvert.SerializeObject(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in NBSpecial: " + ex.Message);
                var emptyResult = new Dictionary<string, object>
            {
                { "cols", new object[] { } },
                { "rows", new object[] { } }
            };
                return JsonConvert.SerializeObject(emptyResult);
            }
        }
    }


    public List<string> RoomTimeDept()
    {
        var departments = new List<string>();

        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();

                string query = @"
                SELECT DISTINCT Depart_Name
                FROM ROEI_SurgeriesCoPailotAverage
                ORDER BY Depart_Name
            ";

                SqlCommand cmd = new SqlCommand(query, cnn);

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        departments.Add(reader["Depart_Name"].ToString());
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error in RoomTimeDept: " + ex.Message);
                // Optionally log or return an empty list
            }
        }

        return departments;
    }

    private string FetchRoomTimeData(string query, SqlParameter[] parameters)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            try
            {
                cnn.Open();
                SqlCommand cmd = new SqlCommand(query, cnn);
                if (parameters != null)
                    cmd.Parameters.AddRange(parameters);

                // Prepare Google Charts columns
                var cols = new[]
                {
                    new Dictionary<string, object> { { "id", "DataSource" }, { "label", "DataSource" }, { "type", "string" } },
                    new Dictionary<string, object> { { "id", "DataType" }, { "label", "DataType" }, { "type", "string" } },
                    new Dictionary<string, object> { { "id", "PeriodDate" }, { "label", "PeriodDate" }, { "type", "string" } },
                    new Dictionary<string, object> { { "id", "Value" }, { "label", "Value" }, { "type", "number" } }
                };

                var rows = new List<Dictionary<string, object>>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var c = new[]
                        {
                            new Dictionary<string, object> { { "v", reader["DataSource"].ToString() } },
                            new Dictionary<string, object> { { "v", reader["DataType"].ToString() } },
                            new Dictionary<string, object> { { "v", Convert.ToDateTime(reader["PeriodDate"]).ToString("yyyy-MM-dd") } },
                            new Dictionary<string, object> { { "v", Convert.ToDouble(reader["Value"]) } }
                        };

                        rows.Add(new Dictionary<string, object> { { "c", c } });
                    }
                }

                var result = new Dictionary<string, object>
                {
                    { "cols", cols },
                    { "rows", rows }
                };

                return JsonConvert.SerializeObject(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
                var emptyResult = new Dictionary<string, object>
                {
                    { "cols", new object[] { } },
                    { "rows", new object[] { } }
                };
                return JsonConvert.SerializeObject(emptyResult);
            }
        }
    }

    // Data access logic
    public string RoomTimeAggregated(string dparam)
    {
        string query = @"
            SELECT DataSource, DataType, PeriodDate, AggregateDays AS Value
            FROM ROEI_SurgeriesCoPailotAggregate
            WHERE Depart_Name = @dparam
        ";
        var parameters = new[] { new SqlParameter("@dparam", dparam) };
        return FetchRoomTimeData(query, parameters);
    }

    public string RoomTimeAvg(string dparam)
    {
        string query = @"
        SELECT 
            DataSource, 
            DataType, 
            PeriodDate, 
            DATEDIFF(SECOND, '00:00:00', AvgTime) AS Value
        FROM ROEI_SurgeriesCoPailotAverage
        WHERE Depart_Name = @dparam
    ";
        var parameters = new[] { new SqlParameter("@dparam", dparam) };
        return FetchRoomTimeData(query, parameters);
    }




    private class RoomTimeRow
    {
        public string DataSource { get; set; }
        public string DataType { get; set; }
        public string DepartName { get; set; }
        public string PeriodDate { get; set; }
        public double Value { get; set; }
    }

    private string FetchRoomTimeDataD(string query, SqlParameter[] parameters)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            cnn.Open();
            SqlCommand cmd = new SqlCommand(query, cnn);
            if (parameters != null)
                cmd.Parameters.AddRange(parameters);

            var cols = new[]
            {
            new Dictionary<string, object> { { "id", "DataSource" }, { "label", "DataSource" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "DataType" }, { "label", "DataType" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "Depart_Name" }, { "label", "Depart_Name" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "PeriodDate" }, { "label", "PeriodDate" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "Value" }, { "label", "Value" }, { "type", "number" } }
        };

            var rawRows = new List<RoomTimeRow>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    double value = Convert.ToDouble(reader["Value"]);
                    if (value == 0)
                        continue; // skip rows where Value = 0

                    rawRows.Add(new RoomTimeRow
                    {
                        DataSource = reader["DataSource"].ToString(),
                        DataType = reader["DataType"].ToString(),
                        DepartName = reader["Depart_Name"].ToString(),
                        PeriodDate = reader["PeriodDate"].ToString(),
                        Value = value
                    });
                }
            }

            // Convert to Google Charts JSON structure
            var rows = new List<Dictionary<string, object>>();
            foreach (var r in rawRows)
            {
                var c = new[]
                {
                new Dictionary<string, object> { { "v", r.DataSource } },
                new Dictionary<string, object> { { "v", r.DataType } },
                new Dictionary<string, object> { { "v", r.DepartName } },
                new Dictionary<string, object> { { "v", r.PeriodDate } },
                new Dictionary<string, object> { { "v", r.Value } }
            };
                rows.Add(new Dictionary<string, object> { { "c", c } });
            }

            var result = new Dictionary<string, object>
        {
            { "cols", cols },
            { "rows", rows }
        };

            return JsonConvert.SerializeObject(result);
        }
    }


    public string RoomTimeAvgD(string dataType = "2-CurrentMonth")
    {
        string query = @"
        SELECT 
            DataSource, 
            DataType, 
            Depart_Name,
            PeriodDate,
            DATEDIFF(SECOND, '00:00:00', AvgTime) AS Value
        FROM ROEI_SurgeriesCoPailotAverage
        WHERE DataType = @dataType
    ";
        var parameters = new[] { new SqlParameter("@dataType", dataType) };
        return FetchRoomTimeDataD(query, parameters);
    }

    public string RoomAggregateDaysD(string dataType)
    {
        string query = @"
        SELECT 
            DataSource, 
            DataType, 
            Depart_Name,
            PeriodDate,
            AggregateDays AS Value
        FROM ROEI_SurgeriesCoPailotAggregate
        WHERE DataType = @dataType
    ";
        var parameters = new[] { new SqlParameter("@dataType", dataType) };
        return FetchRoomTimeDataD(query, parameters);
    }

    public string RoomTimeSummaryAll()
    {
        string query =
            "SELECT " +
            "    DataSource, " +
            "    'ALL' AS DataType, " +
            "    'ALL' AS Depart_Name, " +
            "    PeriodDate, " +
            "    SUM(AggregateDays) AS Value " +
            "FROM ROEI_SurgeriesCoPailotAggregate " +
            "GROUP BY DataSource, PeriodDate " +
            "ORDER BY PeriodDate";

        return FetchRoomTimeDataD(query, null);
    }


    public string RoomTimeSummaryAllCombined()
    {
        string query =
            "SELECT DataSource, 'ALL' AS DataType, 'ALL' AS Depart_Name, PeriodDate, SUM(Value) AS Value " +
            "FROM (" +
            "   SELECT DataSource, DataType, Depart_Name, PeriodDate, AggregateDays AS Value " +
            "   FROM ROEI_SurgeriesCoPailotAggregate " +
            "   UNION ALL " +
            "   SELECT DataSource, DataType, Depart_Name, PeriodDate, DATEDIFF(SECOND, '00:00:00', AvgTime) AS Value " +
            "   FROM ROEI_SurgeriesCoPailotAverage " +
            ") AS Combined " +
            "GROUP BY DataSource, PeriodDate " +
            "ORDER BY PeriodDate";

        return FetchRoomTimeDataD(query, null);
    }



    private string FetchRoomTimeDataSummary(string query, SqlParameter[] parameters)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            cnn.Open();
            SqlCommand cmd = new SqlCommand(query, cnn);
            if (parameters != null)
                cmd.Parameters.AddRange(parameters);

            var cols = new[]
            {
            new Dictionary<string, object> { { "id", "DataSource" }, { "label", "DataSource" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "DataType" }, { "label", "DataType" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "Depart_Name" }, { "label", "Depart_Name" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "PeriodDate" }, { "label", "PeriodDate" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "TotalAggregate" }, { "label", "TotalAggregate" }, { "type", "number" } },
            new Dictionary<string, object> { { "id", "TotalAverage" }, { "label", "TotalAverage" }, { "type", "number" } }
        };

            var rows = new List<Dictionary<string, object>>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    double agg = Convert.ToDouble(reader["TotalAggregate"]);
                    double avg = Convert.ToDouble(reader["TotalAverage"]);

                    rows.Add(new Dictionary<string, object>
                {
                    { "c", new object[]
                        {
                            new Dictionary<string, object> { { "v", reader["DataSource"].ToString() } },
                            new Dictionary<string, object> { { "v", reader["DataType"].ToString() } },
                            new Dictionary<string, object> { { "v", reader["Depart_Name"].ToString() } },
                            new Dictionary<string, object> { { "v", reader["PeriodDate"].ToString() } },
                            new Dictionary<string, object> { { "v", agg } },
                            new Dictionary<string, object> { { "v", avg } }
                        }
                    }
                });
                }
            }

            var result = new Dictionary<string, object>
        {
            { "cols", cols },
            { "rows", rows }
        };

            return JsonConvert.SerializeObject(result);
        }
    }


    public string RoomTimeSummaryAllSeparated()
    {
        string query =
            "WITH Agg AS (" +
            "    SELECT DataSource, DataType, PeriodDate, SUM(CAST(AggregateDays AS FLOAT)) AS TotalAggregate " +
            "    FROM ROEI_SurgeriesCoPailotAggregate " +
            "    GROUP BY DataSource, DataType, PeriodDate " +
            "), " +
            "Avg AS (" +
            "    SELECT DataSource, DataType, PeriodDate, SUM(DATEDIFF(SECOND, '00:00:00', AvgTime)) AS TotalAverage " +
            "    FROM ROEI_SurgeriesCoPailotAverage " +
            "    GROUP BY DataSource, DataType, PeriodDate " +
            "), " +
            "AllKeys AS (" +
            "    SELECT DISTINCT DataSource, DataType, PeriodDate FROM Agg " +
            "    UNION " +
            "    SELECT DISTINCT DataSource, DataType, PeriodDate FROM Avg " +
            ") " +
            "SELECT " +
            "    k.DataSource, " +
            "    k.DataType, " +
            "    'ALL' AS Depart_Name, " +
            "    k.PeriodDate, " +
            "    ISNULL(a.TotalAggregate, 0) AS TotalAggregate, " +
            "    ISNULL(b.TotalAverage, 0) AS TotalAverage " +
            "FROM AllKeys k " +
            "LEFT JOIN Agg a ON k.DataSource = a.DataSource AND k.DataType = a.DataType AND k.PeriodDate = a.PeriodDate " +
            "LEFT JOIN Avg b ON k.DataSource = b.DataSource AND k.DataType = b.DataType AND k.PeriodDate = b.PeriodDate " +
            "ORDER BY k.PeriodDate, k.DataSource";

        return FetchRoomTimeDataSummary(query, null);
    }


    public string RoomTimeSummaryAllSeparated2Y()
    {
        string query = @"
    WITH Agg AS (
        SELECT 
            DataSource,
            CASE 
                WHEN DataType = '3-CurrentYear' THEN '3-CurrentYear'
                WHEN DataType = '4-ParallelsPeriod' THEN '4-ParallelsPeriod'
                ELSE DataType
            END AS DataType,
            CASE 
                WHEN DataType = '3-CurrentYear' THEN DATEFROMPARTS(YEAR(PeriodDate), 1, 1)
                ELSE NULL
            END AS PeriodDate,
            SUM(CAST(AggregateDays AS FLOAT)) AS TotalAggregate,
            COUNT(DISTINCT YEAR(PeriodDate)) AS YearsCount
        FROM ROEI_SurgeriesCoPailotAggregate
        WHERE PeriodDate >= DATEADD(YEAR, -2, CAST(GETDATE() AS DATE))
        GROUP BY DataSource,
                 CASE 
                    WHEN DataType = '3-CurrentYear' THEN '3-CurrentYear'
                    WHEN DataType = '4-ParallelsPeriod' THEN '4-ParallelsPeriod'
                    ELSE DataType
                 END,
                 CASE 
                    WHEN DataType = '3-CurrentYear' THEN DATEFROMPARTS(YEAR(PeriodDate), 1, 1)
                    ELSE NULL
                 END
    ),
    Avg AS (
        SELECT 
            DataSource,
            CASE 
                WHEN DataType = '3-CurrentYear' THEN '3-CurrentYear'
                WHEN DataType = '4-ParallelsPeriod' THEN '4-ParallelsPeriod'
                ELSE DataType
            END AS DataType,
            CASE 
                WHEN DataType = '3-CurrentYear' THEN DATEFROMPARTS(YEAR(PeriodDate), 1, 1)
                ELSE NULL
            END AS PeriodDate,
            AVG(DATEDIFF(SECOND, '00:00:00', AvgTime)) AS TotalAverage,
            COUNT(DISTINCT YEAR(PeriodDate)) AS YearsCount
        FROM ROEI_SurgeriesCoPailotAverage
        WHERE PeriodDate >= DATEADD(YEAR, -2, CAST(GETDATE() AS DATE))
          AND AvgTime > '00:00:00'   -- <== exclude zero values
        GROUP BY DataSource,
                 CASE 
                    WHEN DataType = '3-CurrentYear' THEN '3-CurrentYear'
                    WHEN DataType = '4-ParallelsPeriod' THEN '4-ParallelsPeriod'
                    ELSE DataType
                 END,
                 CASE 
                    WHEN DataType = '3-CurrentYear' THEN DATEFROMPARTS(YEAR(PeriodDate), 1, 1)
                    ELSE NULL
                 END
    ),
    AllKeys AS (
        SELECT DISTINCT DataSource, DataType, PeriodDate FROM Agg
        UNION
        SELECT DISTINCT DataSource, DataType, PeriodDate FROM Avg
    )
    SELECT 
        k.DataSource,
        k.DataType,
        'ALL' AS Depart_Name,
        k.PeriodDate,
        ISNULL(a.TotalAggregate, 0) AS TotalAggregate,
        ISNULL(b.TotalAverage, 0) AS TotalAverage,
        ISNULL(a.YearsCount, b.YearsCount) AS YearsCount
    FROM AllKeys k
    LEFT JOIN Agg a 
        ON k.DataSource = a.DataSource 
       AND k.DataType = a.DataType 
       AND (k.PeriodDate = a.PeriodDate OR (k.PeriodDate IS NULL AND a.PeriodDate IS NULL))
    LEFT JOIN Avg b 
        ON k.DataSource = b.DataSource 
       AND k.DataType = b.DataType 
       AND (k.PeriodDate = b.PeriodDate OR (k.PeriodDate IS NULL AND b.PeriodDate IS NULL))
    ORDER BY k.DataType, k.DataSource;
    ";

        return FetchRoomTimeDataSummary(query, null);
    }


    public sealed class ChartDataDto
    {
        public List<DeptDto> Departments { get; set; }
        public List<DoctorDto> Doctors { get; set; }
    }

    public sealed class DeptDto
    {
        public string Name { get; set; }
        public int Q { get; set; }
        public int AvgDay { get; set; }
    }

    public sealed class DoctorDto
    {
        public string Name { get; set; }
        public string Department { get; set; }
        public int Q { get; set; }
        public int AvgDay { get; set; }
    }

    public ChartDataDto AppointmentsRepository()
    {
        var result = new ChartDataDto
        {
            Departments = new List<DeptDto>(),
            Doctors = new List<DoctorDto>()
        };

        using (var cnn = new SqlConnection(connetionStringNAMER))
        using (var cmd = new SqlCommand(@"
        SELECT Depart_Name, Depart_Name2, Q, AvgDay, DataType
        FROM VW_ROEI_SURGERYLast7DaysAppointmentCoPailot
    ", cnn))
        {
            cnn.Open();
            using (var reader = cmd.ExecuteReader())
            {
                int iDepartName = reader.GetOrdinal("Depart_Name");
                int iDepartName2 = reader.GetOrdinal("Depart_Name2");
                int iQ = reader.GetOrdinal("Q");
                int iAvgDay = reader.GetOrdinal("AvgDay");
                int iDataType = reader.GetOrdinal("DataType");

                while (reader.Read())
                {
                    var dataType = GetStringSafe(reader, iDataType);

                    if (string.Equals(dataType, "Department", StringComparison.OrdinalIgnoreCase))
                    {
                        result.Departments.Add(new DeptDto
                        {
                            Name = GetStringSafe(reader, iDepartName),
                            Q = GetIntSafe(reader, iQ),
                            AvgDay = GetIntSafe(reader, iAvgDay)
                        });
                    }
                    else if (string.Equals(dataType, "Doctor", StringComparison.OrdinalIgnoreCase))
                    {
                        result.Doctors.Add(new DoctorDto
                        {
                            Name = GetStringSafe(reader, iDepartName2),
                            Department = GetStringSafe(reader, iDepartName),
                            Q = GetIntSafe(reader, iQ),
                            AvgDay = GetIntSafe(reader, iAvgDay)
                        });
                    }
                }
            }
        }


        var doctorQByDept = result.Doctors
            .GroupBy(d => (d.Department ?? string.Empty).Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Q), StringComparer.OrdinalIgnoreCase);

        foreach (var dep in result.Departments)
        {
            var depNameKey = (dep.Name ?? string.Empty).Trim();
            int sumDoctorQ;
            if (!doctorQByDept.TryGetValue(depNameKey, out sumDoctorQ))
                sumDoctorQ = 0;

            if (sumDoctorQ < dep.Q)
            {
                var diff = dep.Q - sumDoctorQ;
                if (diff > 0)
                {
                    result.Doctors.Add(new DoctorDto
                    {
                        Name = "ללא שיוך רופא",
                        Department = dep.Name,
                        Q = diff,
                        AvgDay = 0
                    });
                }
            }

        }

        return result;
    }

    private static string GetStringSafe(IDataRecord r, int ordinal)
    {
        return r.IsDBNull(ordinal) ? string.Empty : r.GetString(ordinal).Trim();
    }

    private static int GetIntSafe(IDataRecord r, int ordinal)
    {
        if (r.IsDBNull(ordinal)) return 0;
        int parsed;
        return int.TryParse(r.GetValue(ordinal).ToString(), out parsed) ? parsed : 0;
    }






    private class RoomTimeRowQ
    {
        public string DataSource { get; set; }
        public string DataType { get; set; }
        public string DepartName { get; set; }
        public string PeriodDate { get; set; }
        public double Value { get; set; }
        public double Q { get; set; }
    }
    private string FetchRoomTimeDataDQ(string query, SqlParameter[] parameters)
    {
        using (SqlConnection cnn = new SqlConnection(connetionStringNAMER))
        {
            cnn.Open();
            SqlCommand cmd = new SqlCommand(query, cnn);
            if (parameters != null)
                cmd.Parameters.AddRange(parameters);

            var cols = new[]
            {
            new Dictionary<string, object> { { "id", "DataSource" }, { "label", "DataSource" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "DataType" }, { "label", "DataType" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "Depart_Name" }, { "label", "Depart_Name" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "PeriodDate" }, { "label", "PeriodDate" }, { "type", "string" } },
            new Dictionary<string, object> { { "id", "Value" }, { "label", "Value" }, { "type", "number" } },
            new Dictionary<string, object> { { "id", "Q" }, { "label", "Q" }, { "type", "number" } }
        };

            var rawRows = new List<RoomTimeRowQ>();

            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    double value = Convert.ToDouble(reader["Value"]);
                    if (value == 0)
                        continue; // skip rows where Value = 0

                    double q = 0;
                    if (!(reader["Q"] is DBNull))
                        q = Convert.ToDouble(reader["Q"]);


                    rawRows.Add(new RoomTimeRowQ
                    {
                        DataSource = reader["DataSource"].ToString(),
                        DataType = reader["DataType"].ToString(),
                        DepartName = reader["Depart_Name"].ToString(),
                        PeriodDate = reader["PeriodDate"].ToString(),
                        Value = value,
                        Q = q
                    });
                }
            }

            // Convert to Google Charts JSON structure
            var rows = new List<Dictionary<string, object>>();
            foreach (var r in rawRows)
            {
                var c = new[]
                {
                new Dictionary<string, object> { { "v", r.DataSource } },
                new Dictionary<string, object> { { "v", r.DataType } },
                new Dictionary<string, object> { { "v", r.DepartName } },
                new Dictionary<string, object> { { "v", r.PeriodDate } },
                new Dictionary<string, object> { { "v", r.Value } },
                new Dictionary<string, object> { { "v", r.Q } }
            };
                rows.Add(new Dictionary<string, object> { { "c", c } });
            }

            var result = new Dictionary<string, object>
        {
            { "cols", cols },
            { "rows", rows }
        };

            return JsonConvert.SerializeObject(result);
        }
    }

    public string RoomTimeAvgDQ(string dataType = "2-CurrentMonth")
    {
        string query = @"
        SELECT 
            DataSource, 
            DataType, 
            Depart_Name,
            PeriodDate,
            DATEDIFF(SECOND, '00:00:00', AvgTime) AS Value,
            Q
        FROM ROEI_SurgeriesCoPailotAverage
        WHERE DataType = @dataType
    ";
        var parameters = new[] { new SqlParameter("@dataType", dataType) };
        return FetchRoomTimeDataDQ(query, parameters);
    }

    public string RoomAggregateDaysDQ(string dataType)
    {
        string query = @"
        SELECT 
            DataSource, 
            DataType, 
            Depart_Name,
            PeriodDate,
            AggregateDays AS Value, Q
        FROM ROEI_SurgeriesCoPailotAggregate
        WHERE DataType = @dataType
    ";
        var parameters = new[] { new SqlParameter("@dataType", dataType) };
        return FetchRoomTimeDataDQ(query, parameters);
    }


//    public string GetSurgeryRoomsByDateEx(string date = null)
//    {
//        DateTime targetDate;
//        if (!DateTime.TryParse(date, out targetDate))
//            targetDate = DateTime.Today;

//        var surgeries = new List<object>();

//        using (var cnn = new SqlConnection(connetionStringNAMER))
//        {
//            cnn.Open();

//            const string query = @"
//SELECT
//    -- From SurgeriesCalendarPatients (alias a)
   
//    a.PM_CASE_NUMBER,

//    -- From SurgeriesCalendar (alias b)
//    b.SurgeryRoomDetails,
//    b.ArrivalDate,
//    b.ArrivalTime,
//    b.EndTime,
//    b.RequestedDepartmentDetails,
//    b.SurgeryStatus,
//    b.SurgeryType,
//    b.Duration,
//    b.NOTE,
//    b.SurgeryID,
//    b.Urgency,

//    -- Aggregated from SurgeriesCalendar_Surgeries
//    sAgg.SurgeryName,
//    sAgg.SurgeryCode
//FROM [NAMER].[dbo].[SurgeriesCalendarPatients] AS a
//INNER JOIN [NAMER].[dbo].[SurgeriesCalendar]       AS b
//    ON a.SurgeriesCalendarIDFK = b.Row_ID
//OUTER APPLY (
//    SELECT
//        STUFF((
//            SELECT N', ' + s.Surgery_Name
//            FROM [NAMER].[dbo].[SurgeriesCalendar_Surgeries] AS s
//            WHERE s.SurgeriesCalendarIDFK = b.Row_ID
//            FOR XML PATH(''), TYPE
//        ).value('.', 'nvarchar(max)'), 1, 2, N'') AS SurgeryName,
//        STUFF((
//            SELECT N', ' + s.Surgery_Code
//            FROM [NAMER].[dbo].[SurgeriesCalendar_Surgeries] AS s
//            WHERE s.SurgeriesCalendarIDFK = b.Row_ID
//            FOR XML PATH(''), TYPE
//        ).value('.', 'nvarchar(max)'), 1, 2, N'') AS SurgeryCode
//) AS sAgg
//WHERE b.ArrivalDate >= @date
//  AND b.ArrivalDate < DATEADD(day, 1, @date)
//  AND ISNULL(b.SurgeryStatus, N'') <> N'Canceled'
//  AND ISNULL(b.SurgeryRoomDetails, N'') <> N''
//  AND b.SurgeryRoomDetails NOT LIKE N'%ור%'
//  AND b.SurgeryRoomDetails LIKE N'פז01-20[1-9]'
//  AND LEN(b.SurgeryID) IS NOT NULL
//ORDER BY TRY_CONVERT(int, RIGHT(b.SurgeryRoomDetails, 1)), b.ArrivalTime;";

//            using (var cmd = new SqlCommand(query, cnn))
//            {
//                cmd.Parameters.AddWithValue("@date", targetDate.Date);

//                using (var reader = cmd.ExecuteReader())
//                {
//                    while (reader.Read())
//                    {
//                        surgeries.Add(new
//                        {
//                            SurgeryID = AsString(reader["SurgeryID"]),
//                            SurgeryRoom = AsString(reader["SurgeryRoomDetails"]),
//                            SurgeryDate = AsDateYMD(reader["ArrivalDate"]),
//                            TimeEntranceToTheOperatingRoom = AsTimeHM(reader["ArrivalTime"]),
//                            TimeExitingTheOperatingRoom = AsTimeHM(reader["EndTime"]),
//                            CaseNumber = AsString(reader["PM_CASE_NUMBER"]),
//                            DepartName = AsString(reader["RequestedDepartmentDetails"]),
//                            SurgeryName = AsString(reader["SurgeryName"]),
//                            SurgeryCode = AsString(reader["SurgeryCode"]),
//                            DepartNameDoing = (string)null,
//                            SurgeryPrimary = (string)null,
//                            SurgeryStatus = AsString(reader["SurgeryStatus"]),
//                            TimeSurgeryToDo = AsString(reader["Duration"]),
//                            NoteOrRoomNumber = AsString(reader["NOTE"]),
//                            SurgeryType = AsString(reader["SurgeryType"]),
//                            Urgency = AsString(reader["Urgency"])
//                        });
//                    }
//                }
//            }
//        }

//        var result = new
//        {
//            date = targetDate.ToString("yyyy-MM-dd"),
//            surgeries = surgeries
//        };

//        return JsonConvert.SerializeObject(result);
//    }


    // --- Helpers (C# 5–safe) ---
    private static string AsString(object v) { return v == DBNull.Value ? null : v.ToString(); }
    private static string AsDateYMD(object v)
    {
        if (v == DBNull.Value) return null;
        try { return Convert.ToDateTime(v).ToString("yyyy-MM-dd"); } catch { return null; }
    }
    private static string AsTimeHM(object v)
    {
        if (v == DBNull.Value) return null;
        try
        {
            var ts = v as TimeSpan?;
            if (ts.HasValue) return ts.Value.ToString(@"hh\:mm");
            return Convert.ToDateTime(v).ToString("HH:mm");
        }
        catch
        {
            var s = v.ToString();
            return s != null && s.Length >= 5 ? s.Substring(0, 5) : s;
        }
    }






    public ChartDataDto AppointmentsRepositoryCL()
    {
        var result = new ChartDataDto
        {
            Departments = new List<DeptDto>(),
            Doctors = new List<DoctorDto>()
        };

        using (var cnn = new SqlConnection(connetionStringNAMER))
        using (var cmd = new SqlCommand(@"
        SELECT Depart_Name, Depart_Name2, Q, AvgDay, DataType
        FROM VW_ROEI_Last7DaysClinicAppointment
    ", cnn))
        {
            cnn.Open();
            using (var reader = cmd.ExecuteReader())
            {
                int iDepartName = reader.GetOrdinal("Depart_Name");
                int iDepartName2 = reader.GetOrdinal("Depart_Name2");
                int iQ = reader.GetOrdinal("Q");
                int iAvgDay = reader.GetOrdinal("AvgDay");
                int iDataType = reader.GetOrdinal("DataType");

                while (reader.Read())
                {
                    var dataType = GetStringSafe(reader, iDataType);

                    if (string.Equals(dataType, "Department", StringComparison.OrdinalIgnoreCase))
                    {
                        result.Departments.Add(new DeptDto
                        {
                            Name = GetStringSafe(reader, iDepartName),
                            Q = GetIntSafe(reader, iQ),
                            AvgDay = GetIntSafe(reader, iAvgDay)
                        });
                    }
                    else if (string.Equals(dataType, "Doctor", StringComparison.OrdinalIgnoreCase))
                    {
                        result.Doctors.Add(new DoctorDto
                        {
                            Name = GetStringSafe(reader, iDepartName2),
                            Department = GetStringSafe(reader, iDepartName),
                            Q = GetIntSafe(reader, iQ),
                            AvgDay = GetIntSafe(reader, iAvgDay)
                        });
                    }
                }
            }
        }


        var deptAvgByName = result.Departments
            .GroupBy(d => (d.Name ?? string.Empty).Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().AvgDay, StringComparer.OrdinalIgnoreCase);


        foreach (var d in result.Doctors)
        {
            if (string.Equals(d.Name, "ללא שיוך רופא", StringComparison.OrdinalIgnoreCase))
            {
                var key = (d.Department ?? string.Empty).Trim();
                int depAvg;
                if (deptAvgByName.TryGetValue(key, out depAvg))
                {
                    if (d.AvgDay == 0) d.AvgDay = depAvg;
                }
            }
        }


        var doctorQByDept = result.Doctors
            .GroupBy(d => (d.Department ?? string.Empty).Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Q), StringComparer.OrdinalIgnoreCase);

        foreach (var dep in result.Departments)
        {
            var depNameKey = (dep.Name ?? string.Empty).Trim();
            int sumDoctorQ;
            if (!doctorQByDept.TryGetValue(depNameKey, out sumDoctorQ))
                sumDoctorQ = 0;

            if (sumDoctorQ < dep.Q)
            {
                var diff = dep.Q - sumDoctorQ;
                if (diff > 0)
                {

                    result.Doctors.Add(new DoctorDto
                    {
                        Name = "ללא שיוך רופא",
                        Department = dep.Name,
                        Q = diff,
                        AvgDay = dep.AvgDay
                    });
                }
            }

        }

        return result;
    }

}