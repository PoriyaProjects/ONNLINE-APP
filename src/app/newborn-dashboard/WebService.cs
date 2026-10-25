 
    NewBorn mNewBorn = new NewBorn();
     
 
    [WebGet]
    [WebMethod]
    [OperationContract]
    public List<NewBorn.NewBornUsers> selectNewBornUsers()
    {
        return mNewBorn.selectNewBornUsers();
    }
    [WebGet]
    [WebMethod]
    [OperationContract]
    public void SaveNewBornForm(NewBorn.NewBornRowTable _patientForm)
    {
        mNewBorn.SaveNewBornForm(_patientForm);
    }
    [WebGet]
    [WebMethod]
    [OperationContract]
    public bool CheckNewBornRecordsFromChamelleon()
    {
        return mNewBorn.CheckNewBornRecordsFromChamelleon();
    }
    [WebGet]
    [WebMethod]
    [OperationContract]
    public bool SendMultipleNewBornFiles(string start_date, string end_date)
    {
        return mNewBorn.SendMultipleNewBornFiles(start_date, end_date);
    }
    [WebGet]
    [WebMethod]
    [OperationContract]
    public List<NewBorn.NewBornRowTable> GetNewBornTable(int _pageIndex, int _pageSize, string _freeText, DateTime _fromDate, DateTime _toDate)
    {
        return mNewBorn.GetNewBornTable(_pageIndex, _pageSize, _freeText, _fromDate, _toDate);
    }
 












    [WebMethod]
    public List<NewBorn.BirthSummaryRow> GetBirthSummaryByYishuv(string startDate, string endDate, int? year, int? month, string yishuv)
    {
        return NewBorn.GetBirthSummaryByYishuv(startDate, endDate, year, month, yishuv);
    }

    [WebMethod]
    public List<NewBorn.BirthDetailRow> GetBirthDetails(string startDate, string endDate, int? year, int? month, string yishuv)
    {
        return NewBorn.GetBirthDetails(startDate, endDate, year, month, yishuv);
    }

    [WebMethod]
    public List<NewBorn.PregnancyMonitoringRow> GetPregnancyMonitoring(string startDate, string endDate, int? year, int? month, string yishuv, string status)
    {
        return NewBorn.GetPregnancyMonitoring(startDate, endDate, year, month, yishuv, status);
    }

    [WebMethod]
    public List<NewBorn.BirthStreetHeatRow> GetBirthStreetHeatmap(string startDate, string endDate, int? year, int? month, string yishuv)
    {
        return NewBorn.GetBirthStreetHeatmap(startDate, endDate, year, month, yishuv);
    }



 