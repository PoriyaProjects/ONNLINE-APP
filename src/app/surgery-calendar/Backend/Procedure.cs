using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data.SqlClient;
using SAP.Middleware.Connector;
using System.Globalization;
using System.Data.SqlTypes;

/// <summary>
/// Summary description for Class1
/// </summary>
public class Procedure
{
    RfcDestination _ECCsystem;
    IRfcFunction readTable;
    IRfcFunction readTableText;
    IRfcTable dataTable = null;
    IRfcTable dataTableN2PMDETEXT = null;
    SqlConnection cnn;
    RFC mRFC = new RFC();

    private SqlCommand checkIfExist(string DOKNR, string DOKVR, string T_ICPML)
    {
        string connetionString = "Data Source=SRV-APPDB;Initial Catalog=NAMER;User ID=hrd;Password=3*MFydzDx4%@#AS;";
        if (cnn != null)
            cnn.Close();
        cnn = new SqlConnection(connetionString);

        cnn.Open();
        String query = "SELECT DOKNR FROM Tbl_ERProcedure WHERE DOKNR = @DOKNR AND DOKVR = @DOKVR AND T_ICPML = @T_ICPML";
        SqlCommand command = new SqlCommand(query, cnn);
        command.Parameters.AddWithValue("@DOKNR", DOKNR);
        command.Parameters.AddWithValue("@DOKVR", DOKVR);
        command.Parameters.AddWithValue("@T_ICPML", T_ICPML);
        return command;
    }



    public void selectProcedureFromNamer(DateTime _fromDate, DateTime _toDate)
    {
        string connetionString = "Data Source=SRV-APPDB;Initial Catalog=NAMER;User ID=hrd;Password=3*MFydzDx4%@#AS;";
        try
        {
            _ECCsystem = null;
            _ECCsystem = RfcDestinationManager.GetDestination("PORIA");
            readTable = _ECCsystem.Repository.CreateFunction("BBP_RFC_READ_TABLE");
        }
        catch (Exception e)
        {

        }

        string fromDate = _fromDate.AddDays(0).ToString("yyyyMMdd");
        string toDate = _toDate.ToString("yyyyMMdd");
        List<string> Data = new List<string>();
        String[] Fields_Procedure = new string[] {
            "DOKNR", //מספר מסמך
            "DOKVR", //גרסה
            "T_BGDOP",//תאריך ביצוע
            "T_ICPML", //קוד פעולה
            "T_KTXT1", //טקסט שירות
            "T_ORGFA", //מחלקה רפואית
            "T_ORGPF", //מחלקה רפואית מבצעת

              
        };

        String[] OptionsProcedure = new string[] //בניית מערך 
        {
            " T_BGDOP >= '"+fromDate+"' ",
          // " AND T_BGDOP <= '"+toDate+"' ",

        };
        int LimitProcedure = 100000000;
        String TableNameProcedure = "Y000004909";

        IRfcTable dataTableProcedure = mRFC.runRFC(Fields_Procedure, OptionsProcedure, TableNameProcedure, LimitProcedure, _ECCsystem, readTable);

        foreach (IRfcStructure dataRowProcedure in dataTableProcedure)
        {

            String[] returndataTableProcedure = dataRowProcedure.GetValue("WA").ToString().Split('|');
            if (cnn != null)
                cnn.Close();
            cnn = new SqlConnection(connetionString);
            cnn.Open();
            //string _DOKNR = returndataTableProcedure[0].Trim();
            SqlCommand command = checkIfExist(returndataTableProcedure[0].Trim(), returndataTableProcedure[1].Trim(), returndataTableProcedure[3].Trim());
            var result = command.ExecuteReader();
            if (!result.HasRows)
            {
                String queryInsert = "INSERT INTO dbo.Tbl_ERProcedure (DOKNR, DOKVR, T_BGDOP, T_ICPML, T_KTXT1, T_ORGFA, T_ORGPF) VALUES (@DOKNR, @DOKVR, @T_BGDOP, @T_ICPML, @T_KTXT1, @T_ORGFA, @T_ORGPF)";
                SqlCommand commandInsert = new SqlCommand(queryInsert, cnn);

                commandInsert.Parameters.AddWithValue("@DOKNR", returndataTableProcedure[0].Trim());
                commandInsert.Parameters.AddWithValue("@DOKVR", returndataTableProcedure[1].Trim());


                if (returndataTableProcedure[2].Trim() != "0000000000")
                {
                    commandInsert.Parameters.AddWithValue("@T_BGDOP", DateTime.ParseExact(returndataTableProcedure[2].Trim(), "yyyyMMdd", CultureInfo.InvariantCulture).ToString("yyyy-MM-dd"));
                }
                else
                {
                    commandInsert.Parameters.AddWithValue("@T_BGDOP", SqlDateTime.Null);
                }



                commandInsert.Parameters.AddWithValue("@T_ICPML", returndataTableProcedure[3].Trim());
                commandInsert.Parameters.AddWithValue("@T_KTXT1", returndataTableProcedure[4].Trim());
                commandInsert.Parameters.AddWithValue("@T_ORGFA", returndataTableProcedure[5].Trim());
                commandInsert.Parameters.AddWithValue("@T_ORGPF", returndataTableProcedure[5].Trim());
                try
                {
                    if (cnn != null)
                        cnn.Close();
                    cnn.Open();
                    commandInsert.ExecuteNonQuery();
                }
                catch (Exception e)
                {
                    string debbug = "";
                }
            }
            else
            {
                String queryInsert = "UPDATE Tbl_ERProcedure SET T_BGDOP = @T_BGDOP, T_KTXT1= @T_KTXT1, T_ORGFA = @T_ORGFA, T_ORGPF = @T_ORGPF WHERE DOKNR= @DOKNR AND DOKVR = @DOKVR AND T_ICPML = @T_ICPML ";
                SqlCommand commandInsert = new SqlCommand(queryInsert, cnn);
                commandInsert.Parameters.AddWithValue("@DOKNR", returndataTableProcedure[0].Trim());
                commandInsert.Parameters.AddWithValue("@DOKVR", returndataTableProcedure[1].Trim());


                if (returndataTableProcedure[2].Trim() != "0000000000")
                {
                    commandInsert.Parameters.AddWithValue("@T_BGDOP", DateTime.ParseExact(returndataTableProcedure[2].Trim(), "yyyyMMdd", CultureInfo.InvariantCulture).ToString("yyyy-MM-dd"));
                }
                else
                {
                    commandInsert.Parameters.AddWithValue("@T_BGDOP", SqlDateTime.Null);
                }



                commandInsert.Parameters.AddWithValue("@T_ICPML", returndataTableProcedure[3].Trim());
                commandInsert.Parameters.AddWithValue("@T_KTXT1", returndataTableProcedure[4].Trim());
                commandInsert.Parameters.AddWithValue("@T_ORGFA", returndataTableProcedure[5].Trim());
                commandInsert.Parameters.AddWithValue("@T_ORGPF", returndataTableProcedure[5].Trim());

                try
                {
                    if (cnn != null)
                        cnn.Close();
                    cnn.Open();
                    commandInsert.ExecuteNonQuery();
                }
                catch (Exception e)
                {
                    string debbug = "";
                }
            }
            cnn.Close();
        }
    }
}