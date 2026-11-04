using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Text;
using System.Linq;
using System.Net.Mail;
using System.Threading;
using System.Web;
using System.Globalization;


/// <summary>
/// Summary description for NewBorn
/// </summary>
public class NewBorn
{
    RFC mRFC = new RFC();
    static string connetionString = "Data Source=SRV-APPDB;Initial Catalog=NAMER;User ID=h ;Password=3 ;";
    SqlConnection cnn = new SqlConnection(connetionString);
    SqlConnection cnn_2 = new SqlConnection(connetionString);
    public class NewBornRowTable
    {

        public string RowID { get; set; }
        public string MotherCaseNumber { get; set; }
        public string MotherID { get; set; }
        public string MotherFirstName { get; set; }
        public string MotherLastName { get; set; }
        public string NewBornDOB { get; set; }
        public string NewBornTime { get; set; }
        public string BornProcedure { get; set; }
        public string NewBornGender { get; set; }
        public string NewBornWeight { get; set; }
        public string NewBornWeightInProgress { get; set; }
        public string NewBornWeekOfPregnancy { get; set; }
        public string MultipleBirth { get; set; }
        public string NumberOfBirths { get; set; }
        public string BirthNumber { get; set; }
        public string BirthIsDie { get; set; }
        public string hospitalizedAt { get; set; }
        public string UserName { get; set; }
        public string UserFllName { get; set; }
        public string UserTell { get; set; }
        public string DateTimeInsert { get; set; }
        public string TotalRows { get; set; }
        public string NewBornPondkyat { get; set; }
        public string SentToNamer { get; set; }
        public string LoginUserAD { get; set; }

    }
    public class NewBornUsers
    {
        public string UserID { get; set; }
        public string UserName { get; set; }
        public string UserFullName { get; set; }
        public string CellNumber { get; set; }
    }
    public bool SendMultipleNewBornFiles(string start_date, string end_date)
    {
        try
        {
            cnn_2.Open();

            NewBornRowTable mNewBornUser = new NewBornRowTable();
            string q = "SELECT [RowID],[MotherCaseNumber],[MotherID],[MotherFirstName],[MotherLastName],FORMAT([NewBornDOB], 'dd-MM-yyyy')as [NewBornDOB],[NewBornTime],[BornProcedure],[NewBornGender],[NewBornWeight],[NewBornWeightInProgress],[NewBornWeekOfPregnancy],[MultipleBirth],[NumberOfBirths],[BirthNumber],[BirthIsDie],[hospitalizedAt],[UserName],[DateTimeInsert],[UserFllName],[UserTell],[LoginUserAD],[NewBornPondkyat],[SentToNamer],[FromChamelleon] FROM [NAMER].[dbo].[NewBorn] WHERE [FromChamelleon] = 1 AND CAST(DateTimeInsert as date) between '" + start_date+"' and '"+end_date+ "' AND MotherID NOT LIKE '999%' and MotherCaseNumber not in ('00')";
            SqlCommand command = new SqlCommand(q, cnn_2);
            SqlDataReader commandRowsData = command.ExecuteReader();
            if (commandRowsData.HasRows)
            {
                while (commandRowsData.Read())
                {
                    mNewBornUser.RowID = commandRowsData["RowID"].ToString().Trim();
                    mNewBornUser.MotherCaseNumber = commandRowsData["MotherCaseNumber"].ToString().Trim();
                    mNewBornUser.MotherID = commandRowsData["MotherID"].ToString().Trim();
                    mNewBornUser.MotherFirstName = commandRowsData["MotherFirstName"].ToString().Trim();
                    mNewBornUser.MotherLastName = commandRowsData["MotherLastName"].ToString().Trim();
                    mNewBornUser.NewBornDOB = commandRowsData["NewBornDOB"].ToString().Trim();
                    mNewBornUser.NewBornTime = commandRowsData["NewBornTime"].ToString().Trim();
                    mNewBornUser.BornProcedure = commandRowsData["BornProcedure"].ToString().Trim();
                    mNewBornUser.NewBornGender = commandRowsData["NewBornGender"].ToString().Trim();
                    mNewBornUser.NewBornWeight = commandRowsData["NewBornWeight"].ToString().Trim();
                    mNewBornUser.NewBornWeightInProgress = commandRowsData["NewBornWeightInProgress"].ToString().Trim();
                    mNewBornUser.NewBornWeekOfPregnancy = commandRowsData["NewBornWeekOfPregnancy"].ToString().Trim();
                    mNewBornUser.MultipleBirth = commandRowsData["MultipleBirth"].ToString().Trim();
                    mNewBornUser.NumberOfBirths = commandRowsData["NumberOfBirths"].ToString().Trim();
                    mNewBornUser.BirthNumber = commandRowsData["BirthNumber"].ToString().Trim();
                    mNewBornUser.BirthIsDie = commandRowsData["BirthIsDie"].ToString().Trim();
                    mNewBornUser.hospitalizedAt = commandRowsData["hospitalizedAt"].ToString().Trim();
                    mNewBornUser.UserName = commandRowsData["UserName"].ToString().Trim();
                    mNewBornUser.DateTimeInsert = commandRowsData["DateTimeInsert"].ToString().Trim();
                    mNewBornUser.UserFllName = commandRowsData["UserFllName"].ToString().Trim();
                    mNewBornUser.UserTell = commandRowsData["UserTell"].ToString().Trim();
                    mNewBornUser.LoginUserAD = commandRowsData["LoginUserAD"].ToString().Trim();
                    mNewBornUser.NewBornPondkyat = commandRowsData["NewBornPondkyat"].ToString().Trim();
                    mNewBornUser.SentToNamer = commandRowsData["SentToNamer"].ToString().Trim();
                    string filePathe = mRFC.CreateNewBornPdf(mNewBornUser);
                    Thread.Sleep(100);
                    try
                    {
                        mRFC.LinkNewBornFileToPatientAtNamer(mNewBornUser.MotherCaseNumber, "ZPO_NEWBRN", filePathe);
                    }
                    catch (Exception err)
                    {
                        Console.WriteLine(err.Message);
                    }
                    updateSendTime(mNewBornUser.MotherCaseNumber, mNewBornUser.BirthNumber);
                }
            }
            cnn_2.Close();
            return true;
        }
        catch (Exception ep)
        {
            Console.WriteLine(ep.Message);
            return false;
        }
    }
    public bool CheckNewBornRecordsFromChamelleon()
    {
        //pageIndex = pageSize * pageIndex;
        cnn.Open();

        NewBornRowTable mNewBornUser = new NewBornRowTable();
        string q = "SELECT TOP 1 [RowID],[MotherCaseNumber],[MotherID],[MotherFirstName],[MotherLastName],FORMAT([NewBornDOB], 'dd-MM-yyyy')as [NewBornDOB],[NewBornTime],[BornProcedure],[NewBornGender],[NewBornWeight],[NewBornWeightInProgress],[NewBornWeekOfPregnancy],[MultipleBirth],[NumberOfBirths],[BirthNumber],[BirthIsDie],[hospitalizedAt],[UserName],[DateTimeInsert],[UserFllName],[UserTell],[LoginUserAD],[NewBornPondkyat],[SentToNamer],[FromChamelleon] FROM [NAMER].[dbo].[NewBorn] WHERE [FromChamelleon] = 1 AND [SentToNamer] IS NULL";
        SqlCommand command = new SqlCommand(q, cnn);
        SqlDataReader commandRowsData = command.ExecuteReader();
        if (commandRowsData.HasRows)
        {
            while (commandRowsData.Read())
            {
                mNewBornUser.RowID = commandRowsData["RowID"].ToString().Trim();
                mNewBornUser.MotherCaseNumber = commandRowsData["MotherCaseNumber"].ToString().Trim();
                mNewBornUser.MotherID = commandRowsData["MotherID"].ToString().Trim();
                mNewBornUser.MotherFirstName = commandRowsData["MotherFirstName"].ToString().Trim();
                mNewBornUser.MotherLastName = commandRowsData["MotherLastName"].ToString().Trim();
                mNewBornUser.NewBornDOB = commandRowsData["NewBornDOB"].ToString().Trim();
                mNewBornUser.NewBornTime = commandRowsData["NewBornTime"].ToString().Trim();
                mNewBornUser.BornProcedure = commandRowsData["BornProcedure"].ToString().Trim();
                mNewBornUser.NewBornGender = commandRowsData["NewBornGender"].ToString().Trim();
                mNewBornUser.NewBornWeight = commandRowsData["NewBornWeight"].ToString().Trim();
                mNewBornUser.NewBornWeightInProgress = commandRowsData["NewBornWeightInProgress"].ToString().Trim();
                mNewBornUser.NewBornWeekOfPregnancy = commandRowsData["NewBornWeekOfPregnancy"].ToString().Trim();
                mNewBornUser.MultipleBirth = commandRowsData["MultipleBirth"].ToString().Trim();
                mNewBornUser.NumberOfBirths = commandRowsData["NumberOfBirths"].ToString().Trim();
                mNewBornUser.BirthNumber = commandRowsData["BirthNumber"].ToString().Trim();
                mNewBornUser.BirthIsDie = commandRowsData["BirthIsDie"].ToString().Trim();
                mNewBornUser.hospitalizedAt = commandRowsData["hospitalizedAt"].ToString().Trim();
                mNewBornUser.UserName = commandRowsData["UserName"].ToString().Trim();
                mNewBornUser.DateTimeInsert = commandRowsData["DateTimeInsert"].ToString().Trim();
                mNewBornUser.UserFllName = commandRowsData["UserFllName"].ToString().Trim();
                mNewBornUser.UserTell = commandRowsData["UserTell"].ToString().Trim();
                mNewBornUser.LoginUserAD = commandRowsData["LoginUserAD"].ToString().Trim();
                mNewBornUser.NewBornPondkyat = commandRowsData["NewBornPondkyat"].ToString().Trim();
                mNewBornUser.SentToNamer = commandRowsData["SentToNamer"].ToString().Trim();
            }
        }
        cnn.Close();
        try
        {
            if (mNewBornUser.RowID != null)
            {
                string filePathe = mRFC.CreateNewBornPdf(mNewBornUser);
                Thread.Sleep(100);
                SendMail(filePathe, mNewBornUser.MotherCaseNumber);
                Thread.Sleep(100);
                updateSendTime(mNewBornUser.MotherCaseNumber, mNewBornUser.BirthNumber);
                mRFC.LinkNewBornFileToPatientAtNamer(mNewBornUser.MotherCaseNumber, "ZPO_NEWBRN", filePathe);
            }
            return true;
        }
        catch (Exception ep)
        {
            Console.WriteLine("failed to send email with the following error:");
            Console.WriteLine(ep.Message);
            return false;
        }
    }
    public List<NewBornUsers> selectNewBornUsers()
    {
        //pageIndex = pageSize * pageIndex;
        List<NewBornUsers> mNewBornUsers = new List<NewBornUsers>();
        cnn.Open();

        string q = "SELECT EmployeeID, FirstName, LastName, ADUserName, CellNumber FROM  NAMER.dbo.EP_Employees a left join NAMER.dbo.EP_EmployeeSektors b on a.EmployeeSektorID = b.EmployeeSektorID left join NAMER.dbo.EP_Departnents c on a.DepartnentCode = c.DepartnentCode left join NAMER.dbo.EP_Functions d on a.FunctionID = d.FunctionID WHERE EndWorkDate is null AND ADUserName is not null and ADUserName <> ''  AND DepartnentDescripton = 'חדרי לידה' ";
        SqlCommand command = new SqlCommand(q, cnn);
        SqlDataReader commandRowsData = command.ExecuteReader();
        if (commandRowsData.HasRows)
        {
            while (commandRowsData.Read())
            {
                NewBornUsers mNewBornUser = new NewBornUsers();
                mNewBornUser.UserFullName = commandRowsData["FirstName"].ToString().Trim() + " " + commandRowsData["LastName"].ToString().Trim();
                mNewBornUser.UserID = commandRowsData["EmployeeID"].ToString().Trim();
                mNewBornUser.UserName = commandRowsData["ADUserName"].ToString().Trim();
                mNewBornUser.CellNumber = commandRowsData["CellNumber"].ToString().Trim();
                mNewBornUsers.Add(mNewBornUser);
            }
        }
        cnn.Close();
        return mNewBornUsers;
    }
    private bool updateSendTime(string MotherCaseNumber, string BirthNumber)
    {
        string _mQuery = "UPDATE [NAMER].[dbo].[NewBorn]  SET [SentToNamer] = @SentToNamer WHERE [FromChamelleon] = 1 AND [SentToNamer] IS NULL AND [MotherCaseNumber] = @MotherCaseNumber AND [BirthNumber] = @BirthNumber";
        cnn.Open();
        SqlCommand command = new SqlCommand(_mQuery, cnn);
        command.Parameters.AddWithValue("@MotherCaseNumber", MotherCaseNumber);
        command.Parameters.AddWithValue("@BirthNumber", BirthNumber);
        command.Parameters.AddWithValue("@SentToNamer", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff", CultureInfo.InvariantCulture));
        command.ExecuteReader();
        cnn.Close();
        return true;
    }
    public void SaveNewBornForm(NewBornRowTable mNewBornRowTable)
    {
        if (mNewBornRowTable.RowID == "0" || mNewBornRowTable.RowID == "")
        {
            string _mQuery = "INSERT INTO [dbo].[NewBorn] ( [MotherCaseNumber], [MotherID], [MotherFirstName], [MotherLastName], [NewBornDOB], [NewBornTime], [BornProcedure], [NewBornGender], [NewBornWeight], [NewBornWeightInProgress], [NewBornWeekOfPregnancy] ,[MultipleBirth] ,[NumberOfBirths] ,[BirthNumber] ,[BirthIsDie] ,[hospitalizedAt] ,[UserName] ,[DateTimeInsert] ,[UserFllName], [UserTell], [NewBornPondkyat]) VALUES (@MotherCaseNumber, @MotherID, @MotherFirstName, @MotherLastName, @NewBornDOB, @NewBornTime, @BornProcedure, @NewBornGender, @NewBornWeight, @NewBornWeightInProgress, @NewBornWeekOfPregnancy, @MultipleBirth, @NumberOfBirths, @BirthNumber, @BirthIsDie, @hospitalizedAt, @UserName, GETDATE(), @UserFllName, @UserTell, @NewBornPondkyat)";
            cnn.Open();
            SqlCommand command = new SqlCommand(_mQuery, cnn);
            if (mNewBornRowTable.MultipleBirth == "True")
            {
                mNewBornRowTable.MultipleBirth = "כן";
            }
            if (mNewBornRowTable.BirthIsDie == "True")
            {
                mNewBornRowTable.BirthIsDie = "כן";
            }
            if (mNewBornRowTable.BornProcedure == "True")
            {
                mNewBornRowTable.BornProcedure = "כן";
            }
            if (mNewBornRowTable.NewBornWeightInProgress == "True")
            {
                mNewBornRowTable.NewBornWeightInProgress = "כן";
            }
            command.Parameters.AddWithValue("@MotherCaseNumber", mNewBornRowTable.MotherCaseNumber);
            command.Parameters.AddWithValue("@MotherID", mNewBornRowTable.MotherID);
            command.Parameters.AddWithValue("@MotherFirstName", mNewBornRowTable.MotherFirstName);
            command.Parameters.AddWithValue("@MotherLastName", mNewBornRowTable.MotherLastName);
            command.Parameters.AddWithValue("@NewBornDOB", mNewBornRowTable.NewBornDOB);
            command.Parameters.AddWithValue("@NewBornTime", mNewBornRowTable.NewBornTime);
            command.Parameters.AddWithValue("@BornProcedure", mNewBornRowTable.BornProcedure);
            command.Parameters.AddWithValue("@NewBornGender", mNewBornRowTable.NewBornGender);
            if (mNewBornRowTable.NewBornWeight == "0")
                mNewBornRowTable.NewBornWeight = "";
            command.Parameters.AddWithValue("@NewBornWeight", mNewBornRowTable.NewBornWeight);
            command.Parameters.AddWithValue("@NewBornWeightInProgress", mNewBornRowTable.NewBornWeightInProgress);
            command.Parameters.AddWithValue("@NewBornWeekOfPregnancy", mNewBornRowTable.NewBornWeekOfPregnancy);

            command.Parameters.AddWithValue("@MultipleBirth", mNewBornRowTable.MultipleBirth);
            command.Parameters.AddWithValue("@NumberOfBirths", mNewBornRowTable.NumberOfBirths);
            command.Parameters.AddWithValue("@BirthNumber", mNewBornRowTable.BirthNumber);
            command.Parameters.AddWithValue("@BirthIsDie", mNewBornRowTable.BirthIsDie);
            command.Parameters.AddWithValue("@hospitalizedAt", mNewBornRowTable.hospitalizedAt);
            command.Parameters.AddWithValue("@UserName", mNewBornRowTable.UserName);
            command.Parameters.AddWithValue("@UserFllName", mNewBornRowTable.UserFllName);
            command.Parameters.AddWithValue("@UserTell", mNewBornRowTable.UserTell);
            command.Parameters.AddWithValue("@NewBornPondkyat", mNewBornRowTable.NewBornPondkyat);
            command.ExecuteReader();
            cnn.Close();
            try
            {
                string filePathe = mRFC.CreateNewBornPdf(mNewBornRowTable);
                Thread.Sleep(100);
                SendMail(filePathe, mNewBornRowTable.MotherCaseNumber);
                Thread.Sleep(100);
                mRFC.LinkNewBornFileToPatientAtNamer(mNewBornRowTable.MotherCaseNumber, "ZPO_NEWBRN", filePathe);
            }
            catch (Exception ep)
            {
                Console.WriteLine("failed to send email with the following error:");
                Console.WriteLine(ep.Message);
            }
        }
    }
    public void SendMail(string FilePath, string MotherCaseNumber)
    {
        string mailBody = "*** " + MotherCaseNumber + " *** הודעה למשרד קבלת חולים על לידת ילוד";
        string[] emails = {
            "kabala@tzmc.gov.il",
            "kabalatholim@tzmc.gov.il",
            "lmazor@tzmc.gov.il",
            //"adahabre@tzmc.gov.il",
            //"oamariyo@tzmc.gov.il",
            //"agrodjinov@tzmc.gov.il",
            //"jmassalha@pmc.gov.il",
            //"owertheim@poria.health.gov.il",
        };
        for (int i = 0; i < emails.Length; i++)
        {
            try
            {
                MailMessage mail = new MailMessage();
                SmtpClient SmtpServer = new SmtpClient("10.221.92.27");
                mail.From = new MailAddress("kabala@PMC.GOV.IL");
                mail.Priority = MailPriority.High;
                mail.To.Add(emails[i]);
                mail.Subject = "הודעת לידה מחדר לידה";
                mail.IsBodyHtml = true;
                mail.Body = mailBody;

                System.Net.Mail.Attachment attachment;
                attachment = new System.Net.Mail.Attachment(FilePath);
                mail.Attachments.Add(attachment);



                SmtpServer.Send(mail);

                Console.WriteLine("email was sent successfully!");
            }
            catch (Exception ep)
            {
                Console.WriteLine("failed to send email with the following error:");
                Console.WriteLine(ep.Message);
            }
        }

    }

    public List<NewBornRowTable> GetNewBornTable(int _pageIndex, int _pageSize, string _freeText, DateTime _fromDate, DateTime _toDate)
    {
        List<NewBornRowTable> mNewBornTable = new List<NewBornRowTable>();
        _pageIndex = _pageSize * _pageIndex;
        string _qFreeText = " ";
        string _qDate = " ";
        string startDate = _fromDate.ToString("yyyy-MM-dd");
        string endDate = _toDate.ToString("yyyy-MM-dd");
        _qDate = " AND (CAST([NewBornDOB] AS DATE)  >= '" + startDate + "' AND CAST([NewBornDOB] AS DATE)  <= '" + endDate + "' ) ";
        if (_freeText.Trim() != "")
        {
            _qFreeText = " AND ([MotherCaseNumber] LIKE '%" + _freeText + "%' OR [MotherID] LIKE '%" + _freeText + "%' OR [MotherFirstName] LIKE '%" + _freeText + "%' OR [MotherLastName]  LIKE '%" + _freeText + "%') ";
        }



        Dictionary<string, string> dataTableObjs = new Dictionary<string, string>();
        string totalRows = "0";
        string _mQueryTotalRows = "SELECT COUNT(tbl_1.[RowID]) AS totalRows FROM [NAMER].[dbo].[NewBorn] tbl_1   WHERE 1 = 1  " + _qFreeText + _qDate;
        cnn.Open();
        SqlCommand commandTotal = new SqlCommand(_mQueryTotalRows, cnn);
        SqlDataReader dataReaderTotal = commandTotal.ExecuteReader();
        if (dataReaderTotal.HasRows)
        {
            while (dataReaderTotal.Read())/*036364554*/
            {
                totalRows = dataReaderTotal["totalRows"].ToString();
            }
        }
        cnn.Close();


        string QueryDropDownsOptions = "SELECT [RowID], [MotherCaseNumber], [MotherID], [MotherFirstName], [MotherLastName], FORMAT([NewBornDOB], 'dd-MM-yyyy') NewBornDOB, [NewBornTime], [BornProcedure], [NewBornGender], [NewBornWeight], [NewBornWeightInProgress], [NewBornWeekOfPregnancy], [MultipleBirth], [NumberOfBirths], [BirthNumber], [BirthIsDie], [hospitalizedAt], [UserName], [DateTimeInsert], [UserFllName], [UserTell], [NewBornPondkyat] FROM [NAMER].[dbo].[NewBorn] WHERE 1=1 " + _qDate + _qFreeText + "  ORDER BY  NewBornDOB DESC, NewBornTime DESC, MotherFirstName ASC OFFSET @OFFSET ROWS FETCH NEXT @FETCH ROWS ONLY";
        cnn.Open();
        SqlCommand commandDropDownsOptions = new SqlCommand(QueryDropDownsOptions, cnn);
        commandDropDownsOptions.CommandTimeout = 360;
        commandDropDownsOptions.Parameters.AddWithValue("@OFFSET", _pageIndex);
        commandDropDownsOptions.Parameters.AddWithValue("@FETCH", _pageSize);
        SqlDataReader dataDropDownsOptions = commandDropDownsOptions.ExecuteReader();

        if (dataDropDownsOptions.HasRows)
        {
            while (dataDropDownsOptions.Read())
            {
                NewBornRowTable mNewBornRowTable = new NewBornRowTable();
                mNewBornRowTable.RowID = dataDropDownsOptions["RowID"].ToString().Trim();
                mNewBornRowTable.MotherCaseNumber = dataDropDownsOptions["MotherCaseNumber"].ToString().Trim();
                mNewBornRowTable.MotherID = dataDropDownsOptions["MotherID"].ToString().Trim();
                mNewBornRowTable.MotherFirstName = dataDropDownsOptions["MotherFirstName"].ToString().Trim();
                mNewBornRowTable.MotherLastName = dataDropDownsOptions["MotherLastName"].ToString().Trim();
                mNewBornRowTable.NewBornDOB = dataDropDownsOptions["NewBornDOB"].ToString().Trim();
                mNewBornRowTable.NewBornTime = dataDropDownsOptions["NewBornTime"].ToString().Substring(0, 5).Trim();
                mNewBornRowTable.BornProcedure = dataDropDownsOptions["BornProcedure"].ToString().Trim();
                mNewBornRowTable.NewBornGender = dataDropDownsOptions["NewBornGender"].ToString().Trim();
                mNewBornRowTable.NewBornWeight = dataDropDownsOptions["NewBornWeight"].ToString().Trim();
                mNewBornRowTable.NewBornWeightInProgress = dataDropDownsOptions["NewBornWeightInProgress"].ToString().Trim();
                mNewBornRowTable.MultipleBirth = dataDropDownsOptions["MultipleBirth"].ToString().Trim();
                mNewBornRowTable.NumberOfBirths = dataDropDownsOptions["NumberOfBirths"].ToString().Trim();
                mNewBornRowTable.BirthNumber = dataDropDownsOptions["BirthNumber"].ToString().Trim();
                mNewBornRowTable.BirthIsDie = dataDropDownsOptions["BirthIsDie"].ToString().Trim();
                mNewBornRowTable.hospitalizedAt = dataDropDownsOptions["hospitalizedAt"].ToString().Trim();
                mNewBornRowTable.UserName = dataDropDownsOptions["UserName"].ToString().Trim();
                mNewBornRowTable.NewBornPondkyat = dataDropDownsOptions["NewBornPondkyat"].ToString().Trim();
                mNewBornRowTable.DateTimeInsert = dataDropDownsOptions["DateTimeInsert"].ToString().Trim();
                mNewBornRowTable.NewBornWeekOfPregnancy = dataDropDownsOptions["NewBornWeekOfPregnancy"].ToString().Trim();
                mNewBornRowTable.UserFllName = dataDropDownsOptions["UserFllName"].ToString().Trim();
                mNewBornRowTable.UserTell = dataDropDownsOptions["UserTell"].ToString().Trim();
                mNewBornRowTable.TotalRows = totalRows;
                mNewBornTable.Add(mNewBornRowTable);
            }
        }
        cnn.Close();

        return mNewBornTable;
    }




     



















    public class BirthSummaryRow
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string Yishuv { get; set; }
        public int Births { get; set; }
    }

    public class BirthDetailRow
    {
        public int Year { get; set; }
        public string PatientId { get; set; }
        public string MotherDob { get; set; }
        public int MotherAgeAtBirth { get; set; }
        public string NewbornDob { get; set; }
        public string City { get; set; }
        public string HealthFund { get; set; }
        public string Nationality { get; set; }
        public string PreviousChildren { get; set; }
        public int PregnancyWeek { get; set; }
        public int PregnancyDay { get; set; }
        public int BirthNumberAtHospital { get; set; }
        public int TotalBirthsAtHospital { get; set; }
    }

    public class PregnancyMonitoringRow
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string MonthYear { get; set; }
        public string PatientId { get; set; }
        public string PatientNumber { get; set; }
        public string City { get; set; }
        public string HealthFund { get; set; }
        public string Nationality { get; set; }
        public int Age { get; set; }
        public string PreviousChildren { get; set; }
        public string VisitDate { get; set; }
        public string PregnancyWeekLabel { get; set; }
        public string EstimatedBirthDate { get; set; }
        public int DaysUntilEstimatedBirth { get; set; }
        public int DaysAfterEstimatedBirth { get; set; }
        public int VisitCount { get; set; }
        public string FirstVisit { get; set; }
        public string LastVisit { get; set; }
        public string Status { get; set; }
    }

    public class BirthStreetHeatRow
    {
        public string Kind { get; set; }
        public string City { get; set; }
        public string Street { get; set; }
        public string PostCode { get; set; }
        public string PatientId { get; set; }
        public string EventDate { get; set; }
        public string PregnancyWeek { get; set; }
        public int ValidStreet { get; set; }
        public int CountByStreetKind { get; set; }
        public int StreetPotential { get; set; }
        public decimal MissPercent { get; set; }
    }

    public class GeographicDemographicRow
    {
        public string GeographicAreaCode { get; set; }
        public string Area { get; set; }
        public string City { get; set; }
        public string District { get; set; }
        public string Authority { get; set; }
        public decimal? PointsSocioEconomicIndex { get; set; }
        public decimal? PeripheralityIndex { get; set; }
        public decimal? TechnologyIndex { get; set; }
        public decimal? TechnologyRank { get; set; }
        public decimal? CbsSocioEconomicCluster { get; set; }
        public string AreaType { get; set; }
        public string LocalityGroupType { get; set; }
        public string LeadingSector { get; set; }
        public string DominantFamilyCharacter { get; set; }
        public string ArabType { get; set; }
        public decimal? ArabPresence { get; set; }
        public decimal? HarediPresence { get; set; }
        public decimal? NationalReligiousPresence { get; set; }
        public decimal? RussianPresence { get; set; }
        public decimal? EthiopianPresence { get; set; }
        public decimal? FrenchPresence { get; set; }
        public decimal? HouseholdCount { get; set; }
        public decimal? MedianAge { get; set; }
        public decimal? AverageHouseholdSize { get; set; }
        public decimal? YoungFamilies { get; set; }
        public decimal? LargeFamilies { get; set; }
        public decimal? FamiliesWithAdultChildren { get; set; }
        public decimal? TotalPopulation { get; set; }
        public decimal? TotalWomen { get; set; }
        public decimal? WomenAge20To24 { get; set; }
        public decimal? WomenAge25To29 { get; set; }
        public decimal? WomenAge30To34 { get; set; }
        public decimal? WomenAge35To39 { get; set; }
        public decimal? WomenAge40To44 { get; set; }
        public decimal? WomenAge45To49 { get; set; }
        public decimal? PopulationAge15Plus { get; set; }
        public decimal? PopulationAge0To4 { get; set; }
        public decimal? PopulationAge5To9 { get; set; }
        public decimal? PopulationAge10To14 { get; set; }
        public decimal? PopulationAge15To19 { get; set; }
        public decimal? WomenOfReproductiveAge { get; set; }
        public decimal? Children { get; set; }
    }

















     


    public static List<BirthSummaryRow> GetBirthSummaryByYishuv(string startDate, string endDate, int? year, int? month, string yishuv)
    {
        List<BirthSummaryRow> data = new List<BirthSummaryRow>();

        using (SqlConnection connection = new SqlConnection(connetionString))
        {
            string query = @"

WITH Births AS
(
    SELECT
        YEAR(pm.PM_MOVE_DATE) AS [Year],
        MONTH(pm.PM_MOVE_DATE) AS [Month],
        LTRIM(RTRIM(ISNULL(pm.PM_CITY,N''))) AS Yishuv,
        pm.PM_CASE_NUMBER
    FROM NAMER.dbo.PATIENT_MONITORING pm WITH(NOLOCK)
    LEFT JOIN NAMER.dbo.PM_MoveReasonMap m WITH(NOLOCK)
        ON m.PM_MOVE_CAT = pm.PM_MOVE_CAT
       AND m.PM_MOVE_TYPE = pm.PM_MOVE_TYPE
    WHERE pm.PM_MOVE_CAT = 1
      AND pm.PM_MOVE_TYPE = '02'
      AND pm.PM_MOVE_DATE >= @StartDate
      AND pm.PM_MOVE_DATE < @EndDate
      AND ISNULL(m.Reason,N'') = N'לידה'
)

SELECT
    [Year],
    [Month],
    Yishuv,
    COUNT(DISTINCT PM_CASE_NUMBER) Births
FROM Births
WHERE
    Yishuv <> N''
    AND (@Year IS NULL OR [Year]=@Year)
    AND (@Month IS NULL OR [Month]=@Month)
    AND (@Yishuv='' OR Yishuv=@Yishuv)
GROUP BY
    [Year],
    [Month],
    Yishuv
ORDER BY
    [Year],
    [Month],
    Births DESC,
    Yishuv";

            SqlCommand command = new SqlCommand(query, connection);

            command.Parameters.AddWithValue("@StartDate", startDate);
            command.Parameters.AddWithValue("@EndDate", endDate);
            command.Parameters.AddWithValue("@Year", (object)year ?? DBNull.Value);
            command.Parameters.AddWithValue("@Month", (object)month ?? DBNull.Value);
            command.Parameters.AddWithValue("@Yishuv", yishuv ?? "");

            connection.Open();

            SqlDataReader reader = command.ExecuteReader();

            while (reader.Read())
            {
                BirthSummaryRow row = new BirthSummaryRow();

                row.Year = Convert.ToInt32(reader["Year"]);
                row.Month = Convert.ToInt32(reader["Month"]);
                row.Yishuv = reader["Yishuv"].ToString();
                row.Births = Convert.ToInt32(reader["Births"]);

                data.Add(row);
            }

            connection.Close();
        }

        return data;






    }

    public static List<GeographicDemographicRow> GetGeographicDemographicData()
    {
        List<GeographicDemographicRow> data = new List<GeographicDemographicRow>();

        using (SqlConnection connection = new SqlConnection(connetionString))
        using (SqlCommand command = new SqlCommand(@"
SELECT
    [קוד_אזור_גאוגרפי] AS GeographicAreaCode,
    [אזור_גאורגרפי] AS Area,
    [שם_עיר_יישוב] AS City,
    [שם_נפה] AS District,
    [שם_רשות] AS Authority,
    [מדד_חברתי_כלכלי_של_חברת_פוינטס] AS PointsSocioEconomicIndex,
    [אינדקס_פרפיריאליות] AS PeripheralityIndex,
    [מדד_טכנולוגי] AS TechnologyIndex,
    [דירוג_טכנולוגי] AS TechnologyRank,
    [מדד_חברתי_כלכלי_של_הלמ_ס_באשכולות_של_1_10] AS CbsSocioEconomicCluster,
    [סוג_אזור] AS AreaType,
    [סוג_קבוצת_יישובים] AS LocalityGroupType,
    [מגזר_מוביל_באזור] AS LeadingSector,
    [אופי_משפחתי_דומיננטי_באזור] AS DominantFamilyCharacter,
    [Arab_Type] AS ArabType,
    [נוכחות_ערבים] AS ArabPresence,
    [נוכחות_חרדים] AS HarediPresence,
    [נוכחות_דתיים_לאומיים] AS NationalReligiousPresence,
    [נוכחות_רוסים] AS RussianPresence,
    [נוכחות_אתיופים] AS EthiopianPresence,
    [נוכחות_צרפתים] AS FrenchPresence,
    [מספר_משקי_בית] AS HouseholdCount,
    [חציון_גיל] AS MedianAge,
    [ממוצע_נפשות_למשק_בית] AS AverageHouseholdSize,
    [משפחות_צעירות] AS YoungFamilies,
    [משפחות_מרובות_ילדים] AS LargeFamilies,
    [משפחות_עם_ילדים_בוגרים] AS FamiliesWithAdultChildren,
    [סך_אוכלוסיה] AS TotalPopulation,
    [סך_נשים] AS TotalWomen,
    [נשים_גילאי_20_24] AS WomenAge20To24,
    [נשים_גילאי_25_29] AS WomenAge25To29,
    [נשים_גילאי_30_34] AS WomenAge30To34,
    [נשים_גילאי_35_39] AS WomenAge35To39,
    [נשים_גילאי_40_44] AS WomenAge40To44,
    [נשים_גילאי_45_49] AS WomenAge45To49,
    [סך_אוכלוסיה_גילאי_15_ומעלה] AS PopulationAge15Plus,
    [גילאי_0_4] AS PopulationAge0To4,
    [גילאי_5_9] AS PopulationAge5To9,
    [גילאי_10_14] AS PopulationAge10To14,
    [גילאי_15_19] AS PopulationAge15To19,
    [נשים_בגיל_ההולדה] AS WomenOfReproductiveAge,
    [ילדים] AS Children
FROM [ROEI].[dbo].[GeographicDemographicData] WITH (NOLOCK)
ORDER BY [שם_נפה], [שם_עיר_יישוב], [אזור_גאורגרפי]", connection))
        {
            command.CommandTimeout = DashboardSqlTimeoutSeconds;
            connection.Open();

            using (SqlDataReader reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    data.Add(new GeographicDemographicRow
                    {
                        GeographicAreaCode = ReadNullableString(reader, "GeographicAreaCode"),
                        Area = ReadNullableString(reader, "Area"),
                        City = ReadNullableString(reader, "City"),
                        District = ReadNullableString(reader, "District"),
                        Authority = ReadNullableString(reader, "Authority"),
                        PointsSocioEconomicIndex = ReadNullableDecimal(reader, "PointsSocioEconomicIndex"),
                        PeripheralityIndex = ReadNullableDecimal(reader, "PeripheralityIndex"),
                        TechnologyIndex = ReadNullableDecimal(reader, "TechnologyIndex"),
                        TechnologyRank = ReadNullableDecimal(reader, "TechnologyRank"),
                        CbsSocioEconomicCluster = ReadNullableDecimal(reader, "CbsSocioEconomicCluster"),
                        AreaType = ReadNullableString(reader, "AreaType"),
                        LocalityGroupType = ReadNullableString(reader, "LocalityGroupType"),
                        LeadingSector = ReadNullableString(reader, "LeadingSector"),
                        DominantFamilyCharacter = ReadNullableString(reader, "DominantFamilyCharacter"),
                        ArabType = ReadNullableString(reader, "ArabType"),
                        ArabPresence = ReadNullableDecimal(reader, "ArabPresence"),
                        HarediPresence = ReadNullableDecimal(reader, "HarediPresence"),
                        NationalReligiousPresence = ReadNullableDecimal(reader, "NationalReligiousPresence"),
                        RussianPresence = ReadNullableDecimal(reader, "RussianPresence"),
                        EthiopianPresence = ReadNullableDecimal(reader, "EthiopianPresence"),
                        FrenchPresence = ReadNullableDecimal(reader, "FrenchPresence"),
                        HouseholdCount = ReadNullableDecimal(reader, "HouseholdCount"),
                        MedianAge = ReadNullableDecimal(reader, "MedianAge"),
                        AverageHouseholdSize = ReadNullableDecimal(reader, "AverageHouseholdSize"),
                        YoungFamilies = ReadNullableDecimal(reader, "YoungFamilies"),
                        LargeFamilies = ReadNullableDecimal(reader, "LargeFamilies"),
                        FamiliesWithAdultChildren = ReadNullableDecimal(reader, "FamiliesWithAdultChildren"),
                        TotalPopulation = ReadNullableDecimal(reader, "TotalPopulation"),
                        TotalWomen = ReadNullableDecimal(reader, "TotalWomen"),
                        WomenAge20To24 = ReadNullableDecimal(reader, "WomenAge20To24"),
                        WomenAge25To29 = ReadNullableDecimal(reader, "WomenAge25To29"),
                        WomenAge30To34 = ReadNullableDecimal(reader, "WomenAge30To34"),
                        WomenAge35To39 = ReadNullableDecimal(reader, "WomenAge35To39"),
                        WomenAge40To44 = ReadNullableDecimal(reader, "WomenAge40To44"),
                        WomenAge45To49 = ReadNullableDecimal(reader, "WomenAge45To49"),
                        PopulationAge15Plus = ReadNullableDecimal(reader, "PopulationAge15Plus"),
                        PopulationAge0To4 = ReadNullableDecimal(reader, "PopulationAge0To4"),
                        PopulationAge5To9 = ReadNullableDecimal(reader, "PopulationAge5To9"),
                        PopulationAge10To14 = ReadNullableDecimal(reader, "PopulationAge10To14"),
                        PopulationAge15To19 = ReadNullableDecimal(reader, "PopulationAge15To19"),
                        WomenOfReproductiveAge = ReadNullableDecimal(reader, "WomenOfReproductiveAge"),
                        Children = ReadNullableDecimal(reader, "Children")
                    });
                }
            }
        }

        return data;
    }

    private static string ReadNullableString(SqlDataReader reader, string column)
    {
        return reader[column] == DBNull.Value ? "" : reader[column].ToString().Trim();
    }

    private static decimal? ReadNullableDecimal(SqlDataReader reader, string column)
    {
        object value = reader[column];
        if (value == DBNull.Value) return null;
        if (value is decimal) return (decimal)value;

        // Columns may be stored as text, e.g. "12%", "1,234" or an empty string.
        string text = Convert.ToString(value, CultureInfo.InvariantCulture).Trim().Replace("%", "").Replace(",", "");
        decimal parsed;
        return decimal.TryParse(text, NumberStyles.Any, CultureInfo.InvariantCulture, out parsed) ? parsed : (decimal?)null;
    }




    private const int DashboardSqlTimeoutSeconds = 180;

    /// <summary>
    /// Loads #DashCases and #ChameleonBirths for the given case-number SELECT.
    /// Chameleon is queried in batches of admission numbers, not as a full linked-server scan.
    /// </summary>
    private static void PrepareDashCases(SqlConnection connection, string caseSelectSql, params SqlParameter[] parameters)
    {
        using (SqlCommand drop = new SqlCommand(@"
IF OBJECT_ID('tempdb..#DashCases') IS NOT NULL DROP TABLE #DashCases;
IF OBJECT_ID('tempdb..#ChameleonBirths') IS NOT NULL DROP TABLE #ChameleonBirths;
CREATE TABLE #DashCases (CaseNumber nvarchar(80) NOT NULL PRIMARY KEY);
CREATE TABLE #ChameleonBirths (
    CaseNumber nvarchar(80) NOT NULL PRIMARY KEY,
    Pregnancy_Age_Calculated nvarchar(50) NULL
);", connection))
        {
            drop.CommandTimeout = DashboardSqlTimeoutSeconds;
            drop.ExecuteNonQuery();
        }

        List<string> caseNumbers = new List<string>();
        List<string> admissions = new List<string>();
        HashSet<string> seenCases = new HashSet<string>();
        HashSet<string> seenAdmissions = new HashSet<string>();

        using (SqlCommand cmd = new SqlCommand(caseSelectSql, connection))
        {
            cmd.CommandTimeout = DashboardSqlTimeoutSeconds;
            if (parameters != null)
            {
                for (int i = 0; i < parameters.Length; i++) cmd.Parameters.Add(parameters[i]);
            }
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    string caseNo = reader.IsDBNull(0) ? "" : reader.GetValue(0).ToString().Trim();
                    if (caseNo.Length == 0 || !seenCases.Add(caseNo)) continue;
                    caseNumbers.Add(caseNo);
                    string digits = DigitsOnly(caseNo);
                    string admission = digits.StartsWith("00") ? digits.Substring(2) : digits;
                    if (admission.Length == 0 || !seenAdmissions.Add(admission)) continue;
                    admissions.Add(admission);
                }
            }
        }

        const int batchSize = 400;
        for (int i = 0; i < caseNumbers.Count; i += batchSize)
        {
            StringBuilder values = new StringBuilder();
            int count = Math.Min(batchSize, caseNumbers.Count - i);
            for (int j = 0; j < count; j++)
            {
                if (j > 0) values.Append(',');
                values.Append('(').Append(SqlN(caseNumbers[i + j])).Append(')');
            }
            using (SqlCommand insert = new SqlCommand("INSERT INTO #DashCases (CaseNumber) VALUES " + values, connection))
            {
                insert.CommandTimeout = DashboardSqlTimeoutSeconds;
                insert.ExecuteNonQuery();
            }
        }

        for (int i = 0; i < admissions.Count; i += batchSize)
        {
            StringBuilder inList = new StringBuilder();
            int count = Math.Min(batchSize, admissions.Count - i);
            for (int j = 0; j < count; j++)
            {
                if (j > 0) inList.Append(',');
                inList.Append(SqlN(admissions[i + j]));
            }
            using (SqlCommand insert = new SqlCommand(@"
INSERT INTO #ChameleonBirths (CaseNumber, Pregnancy_Age_Calculated)
SELECT '00' + md.Admission_No, MAX(vbp.Pregnancy_Age_Calculated)
FROM [SRV-CP-DB-3].[Chameleon].[dbo].[MedicalRecords] md WITH (NOLOCK)
INNER JOIN [SRV-CP-DB-3].[Chameleon].[dbo].[V_Birth_Pregnancy_Print] vbp WITH (NOLOCK)
    ON md.Medical_Record = vbp.Medical_Record AND vbp.Delete_Date IS NULL
WHERE vbp.Pregnancy_Age_Calculated IS NOT NULL
  AND md.Admission_No IN (" + inList + @")
GROUP BY md.Admission_No;", connection))
            {
                insert.CommandTimeout = DashboardSqlTimeoutSeconds;
                insert.ExecuteNonQuery();
            }
        }
    }

    private static string DigitsOnly(string value)
    {
        StringBuilder sb = new StringBuilder(value.Length);
        for (int i = 0; i < value.Length; i++)
        {
            if (value[i] >= '0' && value[i] <= '9') sb.Append(value[i]);
        }
        return sb.ToString();
    }

    private static string SqlN(string value)
    {
        return "N'" + (value ?? "").Replace("'", "''") + "'";
    }

    private static string ReadDate(object value)
    {
        if (value == null || value == DBNull.Value) return "";
        return Convert.ToDateTime(value).ToString("yyyy-MM-dd");
    }

    private static int ReadInt(object value)
    {
        if (value == null || value == DBNull.Value) return 0;
        return Convert.ToInt32(value);
    }

    private static SqlParameter[] DateRangeParams(string startDate, string endDate)
    {
        return new SqlParameter[]
        {
            new SqlParameter("@StartDate", (object)startDate ?? DBNull.Value),
            new SqlParameter("@EndDate", (object)endDate ?? DBNull.Value)
        };
    }

    private class StreetHeatCacheEntry
    {
        public string Stamp;
        public List<BirthStreetHeatRow> Rows;
    }

    private static readonly object StreetHeatCacheLock = new object();
    private static readonly Dictionary<string, StreetHeatCacheEntry> StreetHeatCache = new Dictionary<string, StreetHeatCacheEntry>();

    private static string StreetHeatCacheKey(string startDate, string endDate, int? year, int? month, string yishuv)
    {
        return (startDate ?? "") + "|" + (endDate ?? "") + "|"
            + (year.HasValue ? year.Value.ToString() : "") + "|"
            + (month.HasValue ? month.Value.ToString() : "") + "|"
            + (yishuv ?? "");
    }

    /// <summary>
    /// Cheap change token: birth count/max date and maternity-visit count/max date.
    /// Same token means the heavy heatmap query can be skipped.
    /// </summary>
    private static string ReadStreetHeatStamp(SqlConnection connection, string startDate, string endDate)
    {
        string sql = @"
SELECT
    CAST((SELECT COUNT_BIG(*) FROM HEARING_REPORT WITH (NOLOCK) WHERE H_DOB >= @StartDate AND H_DOB < @EndDate) AS varchar(30))
    + '|' + ISNULL(CONVERT(varchar(19), (SELECT MAX(H_DOB) FROM HEARING_REPORT WITH (NOLOCK) WHERE H_DOB >= @StartDate AND H_DOB < @EndDate), 120), '')
    + '|' + CAST((SELECT COUNT_BIG(*) FROM NAMER.dbo.PATIENT_MONITORING WITH (NOLOCK)
        WHERE PM_MOVE_DATE >= @StartDate AND PM_MOVE_DATE < @EndDate
          AND PM_MOVE_CAT = 1 AND PM_MOVE_TYPE = '01'
          AND LTRIM(RTRIM(PM_MOVE_RANGE)) = N'מיון'
          AND LTRIM(RTRIM(PM_MOVE_DEPART)) = N'מ-יולדות') AS varchar(30))
    + '|' + ISNULL(CONVERT(varchar(19), (SELECT MAX(PM_MOVE_DATE) FROM NAMER.dbo.PATIENT_MONITORING WITH (NOLOCK)
        WHERE PM_MOVE_DATE >= @StartDate AND PM_MOVE_DATE < @EndDate
          AND PM_MOVE_CAT = 1 AND PM_MOVE_TYPE = '01'
          AND LTRIM(RTRIM(PM_MOVE_RANGE)) = N'מיון'
          AND LTRIM(RTRIM(PM_MOVE_DEPART)) = N'מ-יולדות'), 120), '')";
        using (SqlCommand command = new SqlCommand(sql, connection))
        {
            command.CommandTimeout = 30;
            command.Parameters.AddWithValue("@StartDate", (object)startDate ?? DBNull.Value);
            command.Parameters.AddWithValue("@EndDate", (object)endDate ?? DBNull.Value);
            object value = command.ExecuteScalar();
            return value == null || value == DBNull.Value ? "" : value.ToString();
        }
    }

    public static List<BirthDetailRow> GetBirthDetails(string startDate, string endDate, int? year, int? month, string yishuv)
    {
        List<BirthDetailRow> data = new List<BirthDetailRow>();

        using (SqlConnection connection = new SqlConnection(connetionString))
        {
            string query = @"

;WITH PM_Single AS
(
    SELECT
        pm.PM_CASE_NUMBER,
        pm.PM_PATIENT_NUMBER,
        pm.PM_DOB,
        MAX(pm.PM_CITY) PM_CITY,
        MAX(pm.PM_PATIENT_ID) PM_PATIENT_ID
    FROM PATIENT_MONITORING pm WITH(NOLOCK)
    INNER JOIN #DashCases b ON b.CaseNumber = pm.PM_CASE_NUMBER COLLATE Hebrew_CI_AS
    WHERE pm.PM_MOVE_IN='X'
    GROUP BY
        pm.PM_CASE_NUMBER,
        pm.PM_PATIENT_NUMBER,
        pm.PM_DOB
),
Base AS
(
SELECT
    YEAR(hr.H_DOB) AS [Year],
    pm.PM_PATIENT_ID AS PatientId,
    pm.PM_DOB AS MotherDob,
    DATEDIFF(YEAR,pm.PM_DOB,hr.H_DOB) AS MotherAgeAtBirth,
    hr.H_DOB AS NewbornDob,
    pm.PM_CITY AS City,
    pi.Institute_Name AS HealthFund,

    CASE np.KONFE
        WHEN '1' THEN N'יהודי'
        WHEN '2' THEN N'מוסלמי'
        WHEN '3' THEN N'מוסלמי'
        WHEN '4' THEN N'נוצרי'
        WHEN '5' THEN N'נוצרי'
        WHEN '6' THEN N'דרוזי'
        ELSE N'אחר'
    END AS Nationality,

    ISNULL(np.ZNCHILDNOZZ,'0') PreviousChildren,

    ISNULL(NULLIF(hr.PregnancyBirthWeek,0),
        TRY_CAST(LEFT(cb.Pregnancy_Age_Calculated,
        CHARINDEX('+',cb.Pregnancy_Age_Calculated)-1) AS INT)
    ) PregnancyWeek,

    ISNULL(NULLIF(hr.PregnancyBirthWeekDay,0),
        TRY_CAST(RIGHT(cb.Pregnancy_Age_Calculated,
        LEN(cb.Pregnancy_Age_Calculated)-CHARINDEX('+',cb.Pregnancy_Age_Calculated)) AS INT)
    ) PregnancyDay,

    ROW_NUMBER() OVER
    (
        PARTITION BY pm.PM_PATIENT_NUMBER
        ORDER BY hr.H_DOB
    ) BirthNumberAtHospital,

    COUNT(*) OVER
    (
        PARTITION BY pm.PM_PATIENT_NUMBER
    ) TotalBirthsAtHospital

FROM HEARING_REPORT hr WITH(NOLOCK)

LEFT JOIN PM_Single pm
ON hr.H_CASE_NUMBER_MOTHER=pm.PM_CASE_NUMBER

LEFT JOIN NPAT np
ON np.PATNR=pm.PM_PATIENT_NUMBER

LEFT JOIN Pay_Institute pi
ON pi.Institute_Code=np.ZNKUPA_NOZZ

LEFT JOIN #ChameleonBirths cb
ON cb.CaseNumber=hr.H_CASE_NUMBER_MOTHER COLLATE Hebrew_CI_AS

WHERE hr.H_DOB>=@StartDate
AND hr.H_DOB<@EndDate
)

SELECT *
FROM Base
WHERE
(@Year IS NULL OR [Year]=@Year)
AND (@Month IS NULL OR MONTH(NewbornDob)=@Month)
AND (@Yishuv='' OR City=@Yishuv)
ORDER BY NewbornDob;
";

            connection.Open();
            PrepareDashCases(connection, @"
SELECT DISTINCT LTRIM(RTRIM(H_CASE_NUMBER_MOTHER))
FROM HEARING_REPORT WITH (NOLOCK)
WHERE H_DOB >= @StartDate AND H_DOB < @EndDate
  AND H_CASE_NUMBER_MOTHER IS NOT NULL AND LTRIM(RTRIM(H_CASE_NUMBER_MOTHER)) <> N''",
                DateRangeParams(startDate, endDate));

            SqlCommand command = new SqlCommand(query, connection);
            command.CommandTimeout = DashboardSqlTimeoutSeconds;
            command.Parameters.AddWithValue("@StartDate", startDate);
            command.Parameters.AddWithValue("@EndDate", endDate);
            command.Parameters.AddWithValue("@Year", (object)year ?? DBNull.Value);
            command.Parameters.AddWithValue("@Month", (object)month ?? DBNull.Value);
            command.Parameters.AddWithValue("@Yishuv", yishuv ?? "");

            SqlDataReader reader = command.ExecuteReader();

            while (reader.Read())
            {
                BirthDetailRow row = new BirthDetailRow();

                row.Year = ReadInt(reader["Year"]);
                row.PatientId = reader["PatientId"].ToString();
                row.MotherDob = ReadDate(reader["MotherDob"]);
                row.MotherAgeAtBirth = ReadInt(reader["MotherAgeAtBirth"]);
                row.NewbornDob = ReadDate(reader["NewbornDob"]);
                row.City = reader["City"].ToString();
                row.HealthFund = reader["HealthFund"].ToString();
                row.Nationality = reader["Nationality"].ToString();
                row.PreviousChildren = reader["PreviousChildren"].ToString();

                row.PregnancyWeek = ReadInt(reader["PregnancyWeek"]);
                row.PregnancyDay = ReadInt(reader["PregnancyDay"]);

                row.BirthNumberAtHospital = ReadInt(reader["BirthNumberAtHospital"]);
                row.TotalBirthsAtHospital = ReadInt(reader["TotalBirthsAtHospital"]);

                data.Add(row);
            }

            reader.Close();
            connection.Close();
        }

        return data;
    }



    public static List<PregnancyMonitoringRow> GetPregnancyMonitoring(string startDate, string endDate, int? year, int? month, string yishuv, string status)
    {
        List<PregnancyMonitoringRow> data = new List<PregnancyMonitoringRow>();

        using (SqlConnection connection = new SqlConnection(connetionString))
        {
            string query = @"

DECLARE @MinWeek INT = 20;
DECLARE @GraceDays INT = 14;

;WITH Delivered AS
(
    SELECT DISTINCT pm.PM_PATIENT_NUMBER
    FROM HEARING_REPORT hr WITH (NOLOCK)
    INNER JOIN PATIENT_MONITORING pm WITH (NOLOCK)
        ON pm.PM_CASE_NUMBER = hr.H_CASE_NUMBER_MOTHER
    WHERE hr.H_DOB>=@StartDate
      AND hr.H_DOB<@EndDate
),
Visits AS
(
SELECT
YEAR(pm.PM_MOVE_DATE) Year,
MONTH(pm.PM_MOVE_DATE) Month,
FORMAT(pm.PM_MOVE_DATE,'MM/yyyy') MonthYear,
pm.PM_PATIENT_ID PatientId,
pm.PM_PATIENT_NUMBER PatientNumber,
pm.PM_CITY City,
pi.Institute_Name HealthFund,

CASE np.KONFE
WHEN '1' THEN N'יהודי'
WHEN '2' THEN N'מוסלמי'
WHEN '3' THEN N'מוסלמי'
WHEN '4' THEN N'נוצרי'
WHEN '5' THEN N'נוצרי'
WHEN '6' THEN N'דרוזי'
ELSE N'אחר'
END Nationality,

DATEDIFF(YEAR,pm.PM_DOB,pm.PM_MOVE_DATE) Age,
ISNULL(np.ZNCHILDNOZZ,'0') PreviousChildren,
CAST(pm.PM_MOVE_DATE AS DATE) VisitDate,
c.Pregnancy_Age_Calculated PregnancyWeekLabel,

DATEADD(DAY,
((40-TRY_CAST(LEFT(c.Pregnancy_Age_Calculated,CHARINDEX('+',c.Pregnancy_Age_Calculated)-1) AS INT))*7)
-
TRY_CAST(RIGHT(c.Pregnancy_Age_Calculated,LEN(c.Pregnancy_Age_Calculated)-CHARINDEX('+',c.Pregnancy_Age_Calculated)) AS INT),
CAST(pm.PM_MOVE_DATE AS DATE)
) EstimatedBirthDate

FROM PATIENT_MONITORING pm WITH (NOLOCK)
INNER JOIN #ChameleonBirths c
ON c.CaseNumber = pm.PM_CASE_NUMBER COLLATE Hebrew_CI_AS
LEFT JOIN NPAT np WITH (NOLOCK)
ON np.PATNR=pm.PM_PATIENT_NUMBER
LEFT JOIN Pay_Institute pi WITH (NOLOCK)
ON pi.Institute_Code=np.ZNKUPA_NOZZ

WHERE pm.PM_MOVE_DATE>=@StartDate
AND pm.PM_MOVE_DATE<@EndDate
)

SELECT
    v.Year,
    v.Month,
    v.MonthYear,
    v.PatientId,
    v.PatientNumber,
    v.City,
    v.HealthFund,
    v.Nationality,
    v.Age,
    v.PreviousChildren,
    v.VisitDate,
    v.PregnancyWeekLabel,
    v.EstimatedBirthDate,
    DATEDIFF(DAY, GETDATE(), v.EstimatedBirthDate) DaysUntilEstimatedBirth,
    CASE
        WHEN GETDATE() > v.EstimatedBirthDate
        THEN DATEDIFF(DAY, v.EstimatedBirthDate, GETDATE())
        ELSE 0
    END DaysAfterEstimatedBirth,

    COUNT(*) OVER(PARTITION BY v.PatientNumber) VisitCount,
    MIN(v.VisitDate) OVER(PARTITION BY v.PatientNumber) FirstVisit,
    MAX(v.VisitDate) OVER(PARTITION BY v.PatientNumber) LastVisit,

    CASE
        WHEN d.PM_PATIENT_NUMBER IS NOT NULL THEN N'לידה'
        WHEN DATEDIFF(DAY, v.EstimatedBirthDate, GETDATE())>= @GraceDays THEN N'ללא לידה'
        ELSE N'עדיין במעקב'
    END Status

FROM Visits v
LEFT JOIN Delivered d
ON d.PM_PATIENT_NUMBER = v.PatientNumber

WHERE
TRY_CAST(LEFT(v.PregnancyWeekLabel, CHARINDEX('+', v.PregnancyWeekLabel) - 1) AS INT) >= @MinWeek

ORDER BY VisitDate DESC;
            ";

            connection.Open();
            using (SqlCommand loadChameleon = new SqlCommand(@"
IF OBJECT_ID('tempdb..#ChameleonBirths') IS NOT NULL DROP TABLE #ChameleonBirths;
CREATE TABLE #ChameleonBirths (
    CaseNumber nvarchar(80) NOT NULL PRIMARY KEY,
    Pregnancy_Age_Calculated nvarchar(50) NULL
);
INSERT INTO #ChameleonBirths (CaseNumber, Pregnancy_Age_Calculated)
SELECT CONVERT(nvarchar(80), CaseNumber), CONVERT(nvarchar(50), Pregnancy_Age_Calculated)
FROM OPENQUERY([SRV-CP-DB-3], '
SELECT ''00'' + md.Admission_No AS CaseNumber,
       MAX(vbp.Pregnancy_Age_Calculated) AS Pregnancy_Age_Calculated
FROM Chameleon.dbo.MedicalRecords md WITH (NOLOCK)
INNER JOIN Chameleon.dbo.V_Birth_Pregnancy_Print vbp WITH (NOLOCK)
  ON md.Medical_Record = vbp.Medical_Record
 AND vbp.Delete_Date IS NULL
WHERE vbp.Pregnancy_Age_Calculated IS NOT NULL
GROUP BY md.Admission_No
')
WHERE CaseNumber IS NOT NULL;
", connection))
            {
                loadChameleon.CommandTimeout = DashboardSqlTimeoutSeconds;
                loadChameleon.ExecuteNonQuery();
            }

            SqlCommand command = new SqlCommand(query, connection);
            command.CommandTimeout = DashboardSqlTimeoutSeconds;
            command.Parameters.AddWithValue("@StartDate", startDate);
            command.Parameters.AddWithValue("@EndDate", endDate);

            SqlDataReader reader = command.ExecuteReader();

            while (reader.Read())
            {
                PregnancyMonitoringRow row = new PregnancyMonitoringRow();

                row.Year = ReadInt(reader["Year"]);
                row.Month = ReadInt(reader["Month"]);
                row.MonthYear = reader["MonthYear"].ToString();
                row.PatientId = reader["PatientId"].ToString();
                row.PatientNumber = reader["PatientNumber"].ToString();
                row.City = reader["City"].ToString();
                row.HealthFund = reader["HealthFund"].ToString();
                row.Nationality = reader["Nationality"].ToString();
                row.Age = ReadInt(reader["Age"]);
                row.PreviousChildren = reader["PreviousChildren"].ToString();
                row.VisitDate = ReadDate(reader["VisitDate"]);
                row.PregnancyWeekLabel = reader["PregnancyWeekLabel"].ToString();
                row.EstimatedBirthDate = ReadDate(reader["EstimatedBirthDate"]);
                row.DaysUntilEstimatedBirth = ReadInt(reader["DaysUntilEstimatedBirth"]);
                row.DaysAfterEstimatedBirth = ReadInt(reader["DaysAfterEstimatedBirth"]);
                row.VisitCount = ReadInt(reader["VisitCount"]);
                row.FirstVisit = ReadDate(reader["FirstVisit"]);
                row.LastVisit = ReadDate(reader["LastVisit"]);
                row.Status = reader["Status"].ToString();

                if ((year == null || row.Year == year) &&
                    (month == null || row.Month == month) &&
                    (string.IsNullOrEmpty(yishuv) || row.City == yishuv) &&
                    (string.IsNullOrEmpty(status) || row.Status == status))
                {
                    data.Add(row);
                }
            }

            reader.Close();
            connection.Close();
        }

        return data;
    }

    public static List<BirthStreetHeatRow> GetBirthStreetHeatmap(string startDate, string endDate, int? year, int? month, string yishuv)
    {
        List<BirthStreetHeatRow> data = new List<BirthStreetHeatRow>();
        string cacheKey = StreetHeatCacheKey(startDate, endDate, year, month, yishuv);
        string stamp = null;

        using (SqlConnection connection = new SqlConnection(connetionString))
        {
            connection.Open();
            try
            {
                stamp = ReadStreetHeatStamp(connection, startDate, endDate);
                lock (StreetHeatCacheLock)
                {
                    StreetHeatCacheEntry cached;
                    if (StreetHeatCache.TryGetValue(cacheKey, out cached) && cached.Stamp == stamp)
                        return cached.Rows;
                }
            }
            catch
            {
                stamp = null;
            }

            string query = @"
DECLARE @MinWeek INT = 20;
DECLARE @GraceDays INT = 14;

;WITH Addr AS (
    SELECT pm.PM_CASE_NUMBER, pm.PM_PATIENT_NUMBER,
           MAX(LTRIM(RTRIM(pm.PM_CITY)))        AS City,
           MAX(LTRIM(RTRIM(pm.PM_STREET_NAME))) AS Street,
           MAX(LTRIM(RTRIM(pm.PM_POST_CODE)))   AS PostCode,
           MAX(LTRIM(RTRIM(pm.PM_PATIENT_ID)))  AS PatientId
    FROM NAMER.dbo.PATIENT_MONITORING pm WITH (NOLOCK)
    INNER JOIN #DashCases d ON d.CaseNumber = pm.PM_CASE_NUMBER COLLATE Hebrew_CI_AS
    WHERE pm.PM_MOVE_IN = 'X'
    GROUP BY pm.PM_CASE_NUMBER, pm.PM_PATIENT_NUMBER
),
Births AS (
    SELECT DISTINCT
        N'לידה' AS Kind,
        a.PM_PATIENT_NUMBER AS PatientNo,
        a.PatientId,
        a.City,
        a.Street,
        a.PostCode,
        CAST(hr.H_DOB AS DATE) AS EventDate,
        CAST(NULL AS NVARCHAR(20)) AS PregWeek
    FROM HEARING_REPORT hr WITH (NOLOCK)
    LEFT JOIN Addr a ON a.PM_CASE_NUMBER = hr.H_CASE_NUMBER_MOTHER
    WHERE hr.H_DOB >= @StartDate AND hr.H_DOB < @EndDate
),
Delivered AS (
    SELECT DISTINCT PatientNo FROM Births
),
LastVisit AS (
    SELECT
        pm.PM_PATIENT_NUMBER AS PatientNo,
        LTRIM(RTRIM(pm.PM_PATIENT_ID))  AS PatientId,
        LTRIM(RTRIM(pm.PM_CITY))        AS City,
        LTRIM(RTRIM(pm.PM_STREET_NAME)) AS Street,
        LTRIM(RTRIM(pm.PM_POST_CODE))   AS PostCode,
        CAST(pm.PM_MOVE_DATE AS DATE)   AS VisitDate,
        c.Pregnancy_Age_Calculated      AS PregWeek,
        TRY_CAST(LEFT(c.Pregnancy_Age_Calculated, CHARINDEX('+', c.Pregnancy_Age_Calculated) - 1) AS INT) AS W,
        TRY_CAST(RIGHT(c.Pregnancy_Age_Calculated, LEN(c.Pregnancy_Age_Calculated) - CHARINDEX('+', c.Pregnancy_Age_Calculated)) AS INT) AS D,
        ROW_NUMBER() OVER (PARTITION BY pm.PM_PATIENT_NUMBER ORDER BY pm.PM_MOVE_DATE DESC, pm.PM_MOVE_TIME DESC) AS rn
    FROM NAMER.dbo.PATIENT_MONITORING pm WITH (NOLOCK)
    INNER JOIN #ChameleonBirths c
        ON c.CaseNumber = pm.PM_CASE_NUMBER COLLATE Hebrew_CI_AS
    WHERE pm.PM_MOVE_DATE >= @StartDate AND pm.PM_MOVE_DATE < @EndDate
      AND pm.PM_MOVE_CAT = 1 AND pm.PM_MOVE_TYPE = '01'
      AND LTRIM(RTRIM(pm.PM_MOVE_RANGE)) = N'מיון'
      AND LTRIM(RTRIM(pm.PM_MOVE_DEPART)) = N'מ-יולדות'
),
Missed AS (
    SELECT
        N'ללא לידה' AS Kind,
        v.PatientNo,
        v.PatientId,
        v.City,
        v.Street,
        v.PostCode,
        v.VisitDate AS EventDate,
        CAST(v.PregWeek AS NVARCHAR(20)) AS PregWeek
    FROM LastVisit v
    WHERE v.rn = 1 AND v.W >= @MinWeek
      AND NOT EXISTS (SELECT 1 FROM Delivered d WHERE d.PatientNo = v.PatientNo)
      AND DATEDIFF(DAY, DATEADD(DAY, ((40 - v.W) * 7) - v.D, v.VisitDate), GETDATE()) >= @GraceDays
),
AllRows AS (
    SELECT * FROM Births
    UNION ALL
    SELECT * FROM Missed
),
Filtered AS (
    SELECT *
    FROM AllRows
    WHERE (@Yishuv = N'' OR City = @Yishuv)
      AND (@Year IS NULL OR YEAR(EventDate) = @Year)
      AND (@Month IS NULL OR MONTH(EventDate) = @Month)
)
SELECT
    Kind,
    City,
    Street,
    PostCode,
    PatientId,
    EventDate,
    PregWeek AS PregnancyWeek,
    CASE WHEN Street IS NULL OR Street = N'' OR Street = City THEN 0 ELSE 1 END AS ValidStreet,
    COUNT(*) OVER (PARTITION BY Kind, City, Street) AS CountByStreetKind,
    COUNT(*) OVER (PARTITION BY City, Street) AS StreetPotential,
    CAST(100.0 * SUM(CASE WHEN Kind = N'ללא לידה' THEN 1 ELSE 0 END)
         OVER (PARTITION BY City, Street)
         / NULLIF(COUNT(*) OVER (PARTITION BY City, Street), 0) AS DECIMAL(5,1)) AS MissPercent
FROM Filtered
ORDER BY City, Street, Kind;
";

            PrepareDashCases(connection, @"
SELECT CaseNumber FROM (
    SELECT LTRIM(RTRIM(H_CASE_NUMBER_MOTHER)) AS CaseNumber
    FROM HEARING_REPORT WITH (NOLOCK)
    WHERE H_DOB >= @StartDate AND H_DOB < @EndDate
    UNION
    SELECT LTRIM(RTRIM(PM_CASE_NUMBER))
    FROM NAMER.dbo.PATIENT_MONITORING WITH (NOLOCK)
    WHERE PM_MOVE_DATE >= @StartDate AND PM_MOVE_DATE < @EndDate
      AND PM_MOVE_CAT = 1 AND PM_MOVE_TYPE = '01'
      AND LTRIM(RTRIM(PM_MOVE_RANGE)) = N'מיון'
      AND LTRIM(RTRIM(PM_MOVE_DEPART)) = N'מ-יולדות'
) s
WHERE CaseNumber IS NOT NULL AND CaseNumber <> N''",
                DateRangeParams(startDate, endDate));

            SqlCommand command = new SqlCommand(query, connection);
            command.CommandTimeout = DashboardSqlTimeoutSeconds;
            command.Parameters.AddWithValue("@StartDate", startDate);
            command.Parameters.AddWithValue("@EndDate", endDate);
            command.Parameters.AddWithValue("@Year", (object)year ?? DBNull.Value);
            command.Parameters.AddWithValue("@Month", (object)month ?? DBNull.Value);
            command.Parameters.AddWithValue("@Yishuv", yishuv ?? "");

            SqlDataReader reader = command.ExecuteReader();

            while (reader.Read())
            {
                BirthStreetHeatRow row = new BirthStreetHeatRow();
                row.Kind = reader["Kind"] == DBNull.Value ? "" : reader["Kind"].ToString();
                row.City = reader["City"] == DBNull.Value ? "" : reader["City"].ToString();
                row.Street = reader["Street"] == DBNull.Value ? "" : reader["Street"].ToString();
                row.PostCode = reader["PostCode"] == DBNull.Value ? "" : reader["PostCode"].ToString();
                row.PatientId = reader["PatientId"] == DBNull.Value ? "" : reader["PatientId"].ToString();
                row.EventDate = reader["EventDate"] == DBNull.Value ? "" : Convert.ToDateTime(reader["EventDate"]).ToString("yyyy-MM-dd");
                row.PregnancyWeek = reader["PregnancyWeek"] == DBNull.Value ? "" : reader["PregnancyWeek"].ToString();
                row.ValidStreet = reader["ValidStreet"] == DBNull.Value ? 0 : Convert.ToInt32(reader["ValidStreet"]);
                row.CountByStreetKind = reader["CountByStreetKind"] == DBNull.Value ? 0 : Convert.ToInt32(reader["CountByStreetKind"]);
                row.StreetPotential = reader["StreetPotential"] == DBNull.Value ? 0 : Convert.ToInt32(reader["StreetPotential"]);
                row.MissPercent = reader["MissPercent"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["MissPercent"]);
                data.Add(row);
            }

            reader.Close();
            connection.Close();
        }

        if (stamp != null)
        {
            lock (StreetHeatCacheLock)
            {
                StreetHeatCache[cacheKey] = new StreetHeatCacheEntry { Stamp = stamp, Rows = data };
            }
        }

        return data;
    }

































}