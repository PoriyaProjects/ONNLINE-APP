-- =============================================================================
-- ONNLINE pinned hamburger menu — run on NAMER (ChameleonConnection / SRV-APPDB)
-- Default pin cap: 10 per user. Raise per user via OnnLineUserMenuPinQuota.
-- =============================================================================
SET NOCOUNT ON;

-- ---------------------------------------------------------------------------
-- 1) Current pins (one row per user + pin)
-- ---------------------------------------------------------------------------
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
GO

-- ---------------------------------------------------------------------------
-- 2) Event log (BI: clicks, pin, unpin). Required for "most pinned then removed".
-- ---------------------------------------------------------------------------
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
GO

-- ---------------------------------------------------------------------------
-- 3) Per-user pin cap. Missing row = 10.
-- ---------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.OnnLineUserMenuPinQuota', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OnnLineUserMenuPinQuota (
        UserName NVARCHAR(128) NOT NULL PRIMARY KEY,
        MaxPins INT NOT NULL,
        UpdatedAt DATETIME NOT NULL CONSTRAINT DF_OnnLineUserMenuPinQuota_UpdatedAt DEFAULT (GETDATE()),
        UpdatedBy NVARCHAR(128) NULL
    );
END
GO

-- ---------------------------------------------------------------------------
-- Allow more than 10 pins for one user (edit @UserName / @MaxPins, then run)
-- ---------------------------------------------------------------------------
/*
DECLARE @UserName NVARCHAR(128) = N'user.name';
DECLARE @MaxPins INT = 15;
DECLARE @UpdatedBy NVARCHAR(128) = N'admin';

MERGE dbo.OnnLineUserMenuPinQuota AS t
USING (SELECT LOWER(@UserName) AS UserName, @MaxPins AS MaxPins, LOWER(@UpdatedBy) AS UpdatedBy) AS s
ON t.UserName = s.UserName
WHEN MATCHED THEN
    UPDATE SET MaxPins = s.MaxPins, UpdatedAt = GETDATE(), UpdatedBy = s.UpdatedBy
WHEN NOT MATCHED THEN
    INSERT (UserName, MaxPins, UpdatedAt, UpdatedBy)
    VALUES (s.UserName, s.MaxPins, GETDATE(), s.UpdatedBy);
*/

-- ---------------------------------------------------------------------------
-- BI
-- ---------------------------------------------------------------------------
-- Feature clicks
-- SELECT COUNT(*) AS FeatureClicks
-- FROM dbo.OnnLineUserMenuPinEvents WITH (NOLOCK)
-- WHERE Action = N'click';

-- Most pinned URL
-- SELECT TOP 20
--     ISNULL(NULLIF(LinkId, N''), PinKey) AS Url,
--     MAX(LinkDescription) AS Title,
--     COUNT(*) AS PinCount
-- FROM dbo.OnnLineUserMenuPinEvents WITH (NOLOCK)
-- WHERE Action = N'pin'
-- GROUP BY ISNULL(NULLIF(LinkId, N''), PinKey)
-- ORDER BY PinCount DESC, Url;

-- Most pinned then removed
-- SELECT TOP 20
--     ISNULL(NULLIF(LinkId, N''), PinKey) AS Url,
--     MAX(LinkDescription) AS Title,
--     COUNT(*) AS UnpinCount
-- FROM dbo.OnnLineUserMenuPinEvents WITH (NOLOCK)
-- WHERE Action = N'unpin'
-- GROUP BY ISNULL(NULLIF(LinkId, N''), PinKey)
-- ORDER BY UnpinCount DESC, Url;
