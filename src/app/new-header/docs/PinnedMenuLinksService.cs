// =============================================================================
// PinnedMenuLinksService.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================
// Per-user pinned hamburger-menu items for ONNLINE-APP.
// Table: dbo.OnnLineUserMenuPins (created automatically if missing).
//
// Then paste WebMethods from:
//   src/app/new-header/docs/WebService-PinnedMenuLinks-NEW-ONLY.cs
// =============================================================================

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Web.Script.Serialization;

public class PinnedMenuLinksService
{
    private static string connetionString;

    static PinnedMenuLinksService()
    {
        ConnectionStringSettings settings = ConfigurationManager.ConnectionStrings["ChameleonConnection"];
        if (settings != null && !string.IsNullOrEmpty(settings.ConnectionString))
        {
            connetionString = settings.ConnectionString;
        }
        else
        {
            settings = ConfigurationManager.ConnectionStrings["ConnectionString"];
            if (settings != null && !string.IsNullOrEmpty(settings.ConnectionString))
            {
                connetionString = settings.ConnectionString;
            }
            else
            {
                connetionString = "Data Source=SRV-APPDB;Initial Catalog=NAMER;Integrated Security=True";
            }
        }
    }

    public List<string> GetPins(string userName)
    {
        List<string> result = new List<string>();
        string user = NormalizeUser(userName);
        if (user.Length == 0)
        {
            return result;
        }

        EnsureTable();

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(
            "SELECT PinKey FROM dbo.OnnLineUserMenuPins WHERE UserName = @UserName ORDER BY SortOrder, RowId",
            conn))
        {
            cmd.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
            conn.Open();
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    if (!reader.IsDBNull(0))
                    {
                        string key = Convert.ToString(reader.GetValue(0));
                        if (!string.IsNullOrEmpty(key))
                        {
                            result.Add(key);
                        }
                    }
                }
            }
        }

        return result;
    }

    public bool SavePins(string userName, string pinnedIdsJson)
    {
        string user = NormalizeUser(userName);
        if (user.Length == 0)
        {
            return false;
        }

        List<string> ids = ParseIds(pinnedIdsJson);
        EnsureTable();

        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            conn.Open();
            SqlTransaction tx = conn.BeginTransaction();
            try
            {
                using (SqlCommand del = new SqlCommand(
                    "DELETE FROM dbo.OnnLineUserMenuPins WHERE UserName = @UserName",
                    conn,
                    tx))
                {
                    del.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
                    del.ExecuteNonQuery();
                }

                for (int i = 0; i < ids.Count; i++)
                {
                    using (SqlCommand ins = new SqlCommand(
                        "INSERT INTO dbo.OnnLineUserMenuPins (UserName, PinKey, SortOrder, UpdatedAt) VALUES (@UserName, @PinKey, @SortOrder, GETDATE())",
                        conn,
                        tx))
                    {
                        ins.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
                        ins.Parameters.Add("@PinKey", SqlDbType.NVarChar, 512).Value = ids[i];
                        ins.Parameters.Add("@SortOrder", SqlDbType.Int).Value = i;
                        ins.ExecuteNonQuery();
                    }
                }

                tx.Commit();
                return true;
            }
            catch
            {
                try
                {
                    tx.Rollback();
                }
                catch
                {
                }
                return false;
            }
        }
    }

    private static string NormalizeUser(string userName)
    {
        if (userName == null)
        {
            return "";
        }
        return userName.Trim().ToLowerInvariant();
    }

    private static List<string> ParseIds(string pinnedIdsJson)
    {
        List<string> result = new List<string>();
        if (string.IsNullOrEmpty(pinnedIdsJson))
        {
            return result;
        }

        JavaScriptSerializer ser = new JavaScriptSerializer();
        object parsed = ser.DeserializeObject(pinnedIdsJson);
        object[] arr = parsed as object[];
        if (arr == null)
        {
            return result;
        }

        for (int i = 0; i < arr.Length; i++)
        {
            if (arr[i] == null)
            {
                continue;
            }
            string s = Convert.ToString(arr[i]).Trim();
            if (s.Length > 0 && result.IndexOf(s) < 0)
            {
                result.Add(s);
            }
        }

        return result;
    }

    private void EnsureTable()
    {
        const string sql = @"
IF OBJECT_ID(N'dbo.OnnLineUserMenuPins', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OnnLineUserMenuPins (
        RowId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserName NVARCHAR(128) NOT NULL,
        PinKey NVARCHAR(512) NOT NULL,
        SortOrder INT NOT NULL,
        UpdatedAt DATETIME NOT NULL CONSTRAINT DF_OnnLineUserMenuPins_UpdatedAt DEFAULT (GETDATE())
    );
    CREATE UNIQUE INDEX UX_OnnLineUserMenuPins_User_Pin ON dbo.OnnLineUserMenuPins (UserName, PinKey);
    CREATE INDEX IX_OnnLineUserMenuPins_User ON dbo.OnnLineUserMenuPins (UserName, SortOrder);
END";
        try
        {
            using (SqlConnection conn = new SqlConnection(connetionString))
            using (SqlCommand cmd = new SqlCommand(sql, conn))
            {
                conn.Open();
                cmd.ExecuteNonQuery();
            }
        }
        catch
        {
        }
    }
}
