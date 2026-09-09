// =============================================================================
// PinnedMenuLinksService.cs — paste into App_Code (C# 5, ASCII-only source)
// =============================================================================
// Per-user pinned hamburger-menu items for ONNLINE-APP.
// Tables (created automatically if missing; or run onnline-user-menu-pins.sql):
//   dbo.OnnLineUserMenuPins
//   dbo.OnnLineUserMenuPinEvents
//   dbo.OnnLineUserMenuPinQuota   (missing row = 5 pins)
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

public class PinnedMenuItem
{
    public string PinKey;
    public string LinkId;
    public string LinkDescription;
}

public class PinnedMenuBiUrlRow
{
    public string Url;
    public string Title;
    public int Cnt;
}

public class PinnedMenuBiResult
{
    public int FeatureClicks;
    public int UniqueUsers;
    public int CurrentPinRows;
    public List<PinnedMenuBiUrlRow> TopPinnedUrls;
    public List<PinnedMenuBiUrlRow> TopPinnedThenRemoved;
}

public class PinnedMenuLinksService
{
    public const int DefaultMaxPins = 5;

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

        EnsureTables();

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

    public int GetQuota(string userName)
    {
        string user = NormalizeUser(userName);
        if (user.Length == 0)
        {
            return DefaultMaxPins;
        }

        EnsureTables();

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(
            "SELECT MaxPins FROM dbo.OnnLineUserMenuPinQuota WHERE UserName = @UserName",
            conn))
        {
            cmd.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
            conn.Open();
            object val = cmd.ExecuteScalar();
            if (val == null || val == DBNull.Value)
            {
                return DefaultMaxPins;
            }
            int maxPins = Convert.ToInt32(val);
            if (maxPins < 1)
            {
                return DefaultMaxPins;
            }
            return maxPins;
        }
    }

    public bool SetQuota(string userName, int maxPins, string updatedBy)
    {
        string user = NormalizeUser(userName);
        if (user.Length == 0 || maxPins < 1 || maxPins > 100)
        {
            return false;
        }

        EnsureTables();

        using (SqlConnection conn = new SqlConnection(connetionString))
        using (SqlCommand cmd = new SqlCommand(@"
MERGE dbo.OnnLineUserMenuPinQuota AS t
USING (SELECT @UserName AS UserName, @MaxPins AS MaxPins, @UpdatedBy AS UpdatedBy) AS s
ON t.UserName = s.UserName
WHEN MATCHED THEN
    UPDATE SET MaxPins = s.MaxPins, UpdatedAt = GETDATE(), UpdatedBy = s.UpdatedBy
WHEN NOT MATCHED THEN
    INSERT (UserName, MaxPins, UpdatedAt, UpdatedBy)
    VALUES (s.UserName, s.MaxPins, GETDATE(), s.UpdatedBy);", conn))
        {
            cmd.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
            cmd.Parameters.Add("@MaxPins", SqlDbType.Int).Value = maxPins;
            cmd.Parameters.Add("@UpdatedBy", SqlDbType.NVarChar, 128).Value = NormalizeUser(updatedBy);
            conn.Open();
            cmd.ExecuteNonQuery();
            return true;
        }
    }

    public bool LogAction(string userName, string action, string pinKey, string linkId, string linkDescription)
    {
        string user = NormalizeUser(userName);
        string act = NormalizeAction(action);
        string key = Truncate(pinKey, 512);
        if (user.Length == 0 || act.Length == 0 || key.Length == 0)
        {
            return false;
        }

        EnsureTables();
        InsertEvent(null, null, user, act, key, Truncate(linkId, 1024), Truncate(linkDescription, 512));
        return true;
    }

    public bool SavePins(string userName, string pinnedIdsJson)
    {
        string user = NormalizeUser(userName);
        if (user.Length == 0)
        {
            return false;
        }

        List<PinnedMenuItem> items = ParseItems(pinnedIdsJson);
        EnsureTables();

        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            conn.Open();
            SqlTransaction tx = conn.BeginTransaction();
            try
            {
                List<PinnedMenuItem> existing = ReadPinItems(conn, tx, user);
                int quota = ReadQuota(conn, tx, user);
                if (items.Count > quota && items.Count > existing.Count)
                {
                    tx.Rollback();
                    return false;
                }

                Dictionary<string, bool> newKeys = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < items.Count; i++)
                {
                    newKeys[items[i].PinKey] = true;
                }

                for (int i = 0; i < items.Count; i++)
                {
                    if (FindItem(existing, items[i].PinKey) == null)
                    {
                        InsertEvent(conn, tx, user, "pin", items[i].PinKey, items[i].LinkId, items[i].LinkDescription);
                    }
                }

                for (int i = 0; i < existing.Count; i++)
                {
                    if (!newKeys.ContainsKey(existing[i].PinKey))
                    {
                        InsertEvent(conn, tx, user, "unpin", existing[i].PinKey, existing[i].LinkId, existing[i].LinkDescription);
                    }
                }

                using (SqlCommand del = new SqlCommand(
                    "DELETE FROM dbo.OnnLineUserMenuPins WHERE UserName = @UserName",
                    conn,
                    tx))
                {
                    del.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
                    del.ExecuteNonQuery();
                }

                for (int i = 0; i < items.Count; i++)
                {
                    using (SqlCommand ins = new SqlCommand(
                        "INSERT INTO dbo.OnnLineUserMenuPins (UserName, PinKey, LinkId, LinkDescription, SortOrder, UpdatedAt) VALUES (@UserName, @PinKey, @LinkId, @LinkDescription, @SortOrder, GETDATE())",
                        conn,
                        tx))
                    {
                        ins.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
                        ins.Parameters.Add("@PinKey", SqlDbType.NVarChar, 512).Value = items[i].PinKey;
                        ins.Parameters.Add("@LinkId", SqlDbType.NVarChar, 1024).Value = Nz(items[i].LinkId);
                        ins.Parameters.Add("@LinkDescription", SqlDbType.NVarChar, 512).Value = Nz(items[i].LinkDescription);
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

    public PinnedMenuBiResult GetBi()
    {
        EnsureTables();
        PinnedMenuBiResult result = new PinnedMenuBiResult();
        result.TopPinnedUrls = new List<PinnedMenuBiUrlRow>();
        result.TopPinnedThenRemoved = new List<PinnedMenuBiUrlRow>();

        using (SqlConnection conn = new SqlConnection(connetionString))
        {
            conn.Open();
            result.FeatureClicks = ExecInt(conn,
                "SELECT COUNT(*) FROM dbo.OnnLineUserMenuPinEvents WITH (NOLOCK) WHERE Action = N'click'");
            result.UniqueUsers = ExecInt(conn,
                "SELECT COUNT(DISTINCT UserName) FROM dbo.OnnLineUserMenuPinEvents WITH (NOLOCK)");
            result.CurrentPinRows = ExecInt(conn,
                "SELECT COUNT(*) FROM dbo.OnnLineUserMenuPins WITH (NOLOCK)");
            result.TopPinnedUrls = ReadUrlRows(conn, "pin");
            result.TopPinnedThenRemoved = ReadUrlRows(conn, "unpin");
        }

        return result;
    }

    private static List<PinnedMenuBiUrlRow> ReadUrlRows(SqlConnection conn, string action)
    {
        List<PinnedMenuBiUrlRow> rows = new List<PinnedMenuBiUrlRow>();
        using (SqlCommand cmd = new SqlCommand(@"
SELECT TOP 20
    ISNULL(NULLIF(LinkId, N''), PinKey) AS Url,
    MAX(LinkDescription) AS Title,
    COUNT(*) AS Cnt
FROM dbo.OnnLineUserMenuPinEvents WITH (NOLOCK)
WHERE Action = @Action
GROUP BY ISNULL(NULLIF(LinkId, N''), PinKey)
ORDER BY Cnt DESC, Url", conn))
        {
            cmd.Parameters.Add("@Action", SqlDbType.NVarChar, 16).Value = action;
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    PinnedMenuBiUrlRow row = new PinnedMenuBiUrlRow();
                    row.Url = reader.IsDBNull(0) ? "" : Convert.ToString(reader.GetValue(0));
                    row.Title = reader.IsDBNull(1) ? "" : Convert.ToString(reader.GetValue(1));
                    row.Cnt = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetValue(2));
                    rows.Add(row);
                }
            }
        }
        return rows;
    }

    private static int ExecInt(SqlConnection conn, string sql)
    {
        using (SqlCommand cmd = new SqlCommand(sql, conn))
        {
            object val = cmd.ExecuteScalar();
            if (val == null || val == DBNull.Value)
            {
                return 0;
            }
            return Convert.ToInt32(val);
        }
    }

    private static List<PinnedMenuItem> ReadPinItems(SqlConnection conn, SqlTransaction tx, string user)
    {
        List<PinnedMenuItem> result = new List<PinnedMenuItem>();
        using (SqlCommand cmd = new SqlCommand(
            "SELECT PinKey, LinkId, LinkDescription FROM dbo.OnnLineUserMenuPins WHERE UserName = @UserName",
            conn,
            tx))
        {
            cmd.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
            using (SqlDataReader reader = cmd.ExecuteReader())
            {
                while (reader.Read())
                {
                    if (reader.IsDBNull(0))
                    {
                        continue;
                    }
                    string key = Convert.ToString(reader.GetValue(0));
                    if (string.IsNullOrEmpty(key))
                    {
                        continue;
                    }
                    PinnedMenuItem item = new PinnedMenuItem();
                    item.PinKey = key;
                    item.LinkId = reader.IsDBNull(1) ? "" : Convert.ToString(reader.GetValue(1));
                    item.LinkDescription = reader.IsDBNull(2) ? "" : Convert.ToString(reader.GetValue(2));
                    result.Add(item);
                }
            }
        }
        return result;
    }

    private static int ReadQuota(SqlConnection conn, SqlTransaction tx, string user)
    {
        using (SqlCommand cmd = new SqlCommand(
            "SELECT MaxPins FROM dbo.OnnLineUserMenuPinQuota WHERE UserName = @UserName",
            conn,
            tx))
        {
            cmd.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
            object val = cmd.ExecuteScalar();
            if (val == null || val == DBNull.Value)
            {
                return DefaultMaxPins;
            }
            int maxPins = Convert.ToInt32(val);
            if (maxPins < 1)
            {
                return DefaultMaxPins;
            }
            return maxPins;
        }
    }

    private static void InsertEvent(SqlConnection conn, SqlTransaction tx, string user, string action, string pinKey, string linkId, string linkDescription)
    {
        bool ownConn = conn == null;
        if (ownConn)
        {
            conn = new SqlConnection(connetionString);
            conn.Open();
        }
        try
        {
            using (SqlCommand cmd = new SqlCommand(
                "INSERT INTO dbo.OnnLineUserMenuPinEvents (UserName, Action, PinKey, LinkId, LinkDescription, CreatedAt) VALUES (@UserName, @Action, @PinKey, @LinkId, @LinkDescription, GETDATE())",
                conn,
                tx))
            {
                cmd.Parameters.Add("@UserName", SqlDbType.NVarChar, 128).Value = user;
                cmd.Parameters.Add("@Action", SqlDbType.NVarChar, 16).Value = action;
                cmd.Parameters.Add("@PinKey", SqlDbType.NVarChar, 512).Value = Truncate(pinKey, 512);
                cmd.Parameters.Add("@LinkId", SqlDbType.NVarChar, 1024).Value = Nz(Truncate(linkId, 1024));
                cmd.Parameters.Add("@LinkDescription", SqlDbType.NVarChar, 512).Value = Nz(Truncate(linkDescription, 512));
                cmd.ExecuteNonQuery();
            }
        }
        finally
        {
            if (ownConn)
            {
                conn.Dispose();
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

    private static string NormalizeAction(string action)
    {
        if (action == null)
        {
            return "";
        }
        string a = action.Trim().ToLowerInvariant();
        if (a == "click" || a == "pin" || a == "unpin")
        {
            return a;
        }
        return "";
    }

    private static List<PinnedMenuItem> ParseItems(string pinnedIdsJson)
    {
        List<PinnedMenuItem> result = new List<PinnedMenuItem>();
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

            PinnedMenuItem item = new PinnedMenuItem();
            Dictionary<string, object> dict = arr[i] as Dictionary<string, object>;
            if (dict != null)
            {
                item.PinKey = Truncate(DictStr(dict, "pinKey", "PinKey"), 512);
                item.LinkId = Truncate(DictStr(dict, "linkId", "LinkId"), 1024);
                item.LinkDescription = Truncate(DictStr(dict, "linkDescription", "LinkDescription"), 512);
            }
            else
            {
                item.PinKey = Truncate(Convert.ToString(arr[i]).Trim(), 512);
            }

            if (item.PinKey.Length == 0)
            {
                continue;
            }
            if (FindItem(result, item.PinKey) != null)
            {
                continue;
            }
            result.Add(item);
        }

        return result;
    }

    private static string DictStr(Dictionary<string, object> dict, string key1, string key2)
    {
        object val;
        if (dict.TryGetValue(key1, out val) && val != null)
        {
            return Convert.ToString(val).Trim();
        }
        if (dict.TryGetValue(key2, out val) && val != null)
        {
            return Convert.ToString(val).Trim();
        }
        return "";
    }

    private static PinnedMenuItem FindItem(List<PinnedMenuItem> items, string pinKey)
    {
        for (int i = 0; i < items.Count; i++)
        {
            if (string.Equals(items[i].PinKey, pinKey, StringComparison.OrdinalIgnoreCase))
            {
                return items[i];
            }
        }
        return null;
    }

    private static object Nz(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return DBNull.Value;
        }
        return value;
    }

    private static string Truncate(string value, int max)
    {
        if (value == null)
        {
            return "";
        }
        string s = value.Trim();
        if (s.Length <= max)
        {
            return s;
        }
        return s.Substring(0, max);
    }

    private void EnsureTables()
    {
        const string sql = @"
IF OBJECT_ID(N'dbo.OnnLineUserMenuPins', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OnnLineUserMenuPins (
        RowId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserName NVARCHAR(128) NOT NULL,
        PinKey NVARCHAR(512) NOT NULL,
        LinkId NVARCHAR(1024) NULL,
        LinkDescription NVARCHAR(512) NULL,
        SortOrder INT NOT NULL,
        UpdatedAt DATETIME NOT NULL CONSTRAINT DF_OnnLineUserMenuPins_UpdatedAt DEFAULT (GETDATE())
    );
    CREATE UNIQUE INDEX UX_OnnLineUserMenuPins_User_Pin ON dbo.OnnLineUserMenuPins (UserName, PinKey);
    CREATE INDEX IX_OnnLineUserMenuPins_User ON dbo.OnnLineUserMenuPins (UserName, SortOrder);
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.OnnLineUserMenuPins', N'LinkId') IS NULL
        ALTER TABLE dbo.OnnLineUserMenuPins ADD LinkId NVARCHAR(1024) NULL;
    IF COL_LENGTH(N'dbo.OnnLineUserMenuPins', N'LinkDescription') IS NULL
        ALTER TABLE dbo.OnnLineUserMenuPins ADD LinkDescription NVARCHAR(512) NULL;
END

IF OBJECT_ID(N'dbo.OnnLineUserMenuPinEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OnnLineUserMenuPinEvents (
        RowId INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserName NVARCHAR(128) NOT NULL,
        Action NVARCHAR(16) NOT NULL,
        PinKey NVARCHAR(512) NOT NULL,
        LinkId NVARCHAR(1024) NULL,
        LinkDescription NVARCHAR(512) NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_OnnLineUserMenuPinEvents_CreatedAt DEFAULT (GETDATE())
    );
    CREATE INDEX IX_OnnLineUserMenuPinEvents_Action ON dbo.OnnLineUserMenuPinEvents (Action, CreatedAt);
    CREATE INDEX IX_OnnLineUserMenuPinEvents_User ON dbo.OnnLineUserMenuPinEvents (UserName, CreatedAt);
END

IF OBJECT_ID(N'dbo.OnnLineUserMenuPinQuota', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OnnLineUserMenuPinQuota (
        UserName NVARCHAR(128) NOT NULL PRIMARY KEY,
        MaxPins INT NOT NULL,
        UpdatedAt DATETIME NOT NULL CONSTRAINT DF_OnnLineUserMenuPinQuota_UpdatedAt DEFAULT (GETDATE()),
        UpdatedBy NVARCHAR(128) NULL
    );
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
