/*
  Doctors Permissions / מערכת הרשאות רופאים
  Database: NAMER
  Does not alter EP_Employees or EP_Departnents.

  Run once in SSMS against NAMER before using the module.
  Safe to re-run: objects are created only when missing.

  Groups, the permission catalog, profile definitions, and employee-profile
  assignments are owned by the existing NAMER tables:
    dbo.AD_DoctorAuthorizationGroup
    dbo.AD_DoctorAuthorizations
    dbo.AD_DoctorAuthorizationProfile
    dbo.AD_DoctorAuthorizationsList
  This script does not create those tables and does not drop anything.
  The older DoctorPermissions / template / employee-profile masters are not
  created for a new install. Databases that already have them are left as-is.
*/
SET NOCOUNT ON;
USE [NAMER];
GO

IF 1 = 0 AND OBJECT_ID(N'dbo.DoctorPermissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissions (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissions PRIMARY KEY,
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000) NULL,
        Category NVARCHAR(100) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DoctorPermissions_IsActive DEFAULT (1),
        DefaultValidityMonths INT NOT NULL CONSTRAINT DF_DoctorPermissions_Validity DEFAULT (36),
        RenewalLeadMonths INT NOT NULL CONSTRAINT DF_DoctorPermissions_Lead DEFAULT (3),
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_DoctorPermissions_CreatedAt DEFAULT (GETDATE()),
        CreatedBy NVARCHAR(50) NULL,
        UpdatedAt DATETIME NULL,
        UpdatedBy NVARCHAR(50) NULL,
        CONSTRAINT UQ_DoctorPermissions_Code UNIQUE (Code),
        CONSTRAINT CK_DoctorPermissions_Validity CHECK (DefaultValidityMonths BETWEEN 1 AND 120),
        CONSTRAINT CK_DoctorPermissions_Lead CHECK (RenewalLeadMonths BETWEEN 0 AND 36 AND RenewalLeadMonths < DefaultValidityMonths)
    );
END
GO

IF OBJECT_ID(N'dbo.DoctorPermissions', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_DoctorPermissions_Lead'
      AND parent_object_id = OBJECT_ID(N'dbo.DoctorPermissions')
      AND definition LIKE N'%DefaultValidityMonths%'
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE name = N'CK_DoctorPermissions_Lead'
          AND parent_object_id = OBJECT_ID(N'dbo.DoctorPermissions')
    )
        ALTER TABLE dbo.DoctorPermissions DROP CONSTRAINT CK_DoctorPermissions_Lead;

    ALTER TABLE dbo.DoctorPermissions
        ADD CONSTRAINT CK_DoctorPermissions_Lead
        CHECK (RenewalLeadMonths BETWEEN 0 AND 36 AND RenewalLeadMonths < DefaultValidityMonths);
END
GO

IF 1 = 0 AND OBJECT_ID(N'dbo.DoctorPermissionProfileTemplates', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionProfileTemplates (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissionProfileTemplates PRIMARY KEY,
        Name NVARCHAR(200) NOT NULL,
        DepartmentCode NVARCHAR(50) NOT NULL,
        FunctionID NVARCHAR(50) NULL,
        JobTitleID NVARCHAR(50) NULL,
        Specialty NVARCHAR(200) NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DpTemplates_IsActive DEFAULT (1),
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_DpTemplates_CreatedAt DEFAULT (GETDATE()),
        CreatedBy NVARCHAR(50) NULL,
        UpdatedAt DATETIME NULL,
        UpdatedBy NVARCHAR(50) NULL
    );
    CREATE INDEX IX_DpTemplates_Dept ON dbo.DoctorPermissionProfileTemplates (DepartmentCode, IsActive);
END
GO

IF 1 = 0 AND OBJECT_ID(N'dbo.DoctorPermissionProfileTemplateItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionProfileTemplateItems (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissionProfileTemplateItems PRIMARY KEY,
        ProfileTemplateId INT NOT NULL,
        PermissionId INT NOT NULL,
        IsRequired BIT NOT NULL CONSTRAINT DF_DpTemplateItems_Required DEFAULT (1),
        SortOrder INT NOT NULL CONSTRAINT DF_DpTemplateItems_Sort DEFAULT (0),
        CONSTRAINT UQ_DpTemplateItems UNIQUE (ProfileTemplateId, PermissionId),
        CONSTRAINT FK_DpTemplateItems_Template FOREIGN KEY (ProfileTemplateId) REFERENCES dbo.DoctorPermissionProfileTemplates (Id),
        CONSTRAINT FK_DpTemplateItems_Permission FOREIGN KEY (PermissionId) REFERENCES dbo.DoctorPermissions (Id)
    );
END
GO

IF 1 = 0 AND OBJECT_ID(N'dbo.DoctorEmployeeProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorEmployeeProfiles (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorEmployeeProfiles PRIMARY KEY,
        EmployeeId NVARCHAR(50) NOT NULL,
        ProfileTemplateId INT NULL,
        DepartmentCode NVARCHAR(50) NOT NULL,
        FunctionID NVARCHAR(50) NULL,
        JobTitleID NVARCHAR(50) NULL,
        Specialty NVARCHAR(200) NULL,
        ProfileName NVARCHAR(200) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DpEmpProfiles_IsActive DEFAULT (1),
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_DpEmpProfiles_CreatedAt DEFAULT (GETDATE()),
        CreatedBy NVARCHAR(50) NULL,
        UpdatedAt DATETIME NULL,
        UpdatedBy NVARCHAR(50) NULL,
        ClosedAt DATETIME NULL,
        CONSTRAINT FK_DpEmpProfiles_Template FOREIGN KEY (ProfileTemplateId) REFERENCES dbo.DoctorPermissionProfileTemplates (Id)
    );
    CREATE INDEX IX_DpEmpProfiles_Employee ON dbo.DoctorEmployeeProfiles (EmployeeId, IsActive);
    CREATE INDEX IX_DpEmpProfiles_Dept ON dbo.DoctorEmployeeProfiles (DepartmentCode, IsActive);
END
GO

IF 1 = 0 AND OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorEmployeeProfilePermissions (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorEmployeeProfilePermissions PRIMARY KEY,
        EmployeeProfileId INT NOT NULL,
        PermissionId INT NOT NULL,
        Status NVARCHAR(30) NOT NULL CONSTRAINT DF_DpEmpPerm_Status DEFAULT (N'DRAFT'),
        ApprovalDate DATETIME NULL,
        ExpirationDate DATETIME NULL,
        ApprovedBy NVARCHAR(50) NULL,
        RejectedBy NVARCHAR(50) NULL,
        RejectionReason NVARCHAR(1000) NULL,
        RenewalSourceId INT NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_DpEmpPerm_CreatedAt DEFAULT (GETDATE()),
        CreatedBy NVARCHAR(50) NULL,
        UpdatedAt DATETIME NULL,
        UpdatedBy NVARCHAR(50) NULL,
        CONSTRAINT FK_DpEmpPerm_Profile FOREIGN KEY (EmployeeProfileId) REFERENCES dbo.DoctorEmployeeProfiles (Id),
        CONSTRAINT FK_DpEmpPerm_Permission FOREIGN KEY (PermissionId) REFERENCES dbo.DoctorPermissions (Id),
        CONSTRAINT FK_DpEmpPerm_Renewal FOREIGN KEY (RenewalSourceId) REFERENCES dbo.DoctorEmployeeProfilePermissions (Id),
        CONSTRAINT CK_DpEmpPerm_Status CHECK (Status IN (
            N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'REJECTED', N'EXPIRED', N'SUSPENDED', N'CANCELLED'
        ))
    );
    CREATE INDEX IX_DpEmpPerm_ProfileStatus ON dbo.DoctorEmployeeProfilePermissions (EmployeeProfileId, Status);
    CREATE INDEX IX_DpEmpPerm_StatusExp ON dbo.DoctorEmployeeProfilePermissions (Status, ExpirationDate);
    CREATE INDEX IX_DpEmpPerm_Permission ON dbo.DoctorEmployeeProfilePermissions (PermissionId, Status);
END
GO

IF OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DpEmpPerm_OpenSame'
      AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions')
)
BEGIN
    CREATE UNIQUE INDEX UX_DpEmpPerm_OpenSame
        ON dbo.DoctorEmployeeProfilePermissions (EmployeeProfileId, PermissionId)
        WHERE Status IN (N'DRAFT', N'PENDING_APPROVAL', N'APPROVED', N'SUSPENDED');
END
GO

IF OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DpEmpPerm_OpenRenewal'
      AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions')
)
BEGIN
    CREATE UNIQUE INDEX UX_DpEmpPerm_OpenRenewal
        ON dbo.DoctorEmployeeProfilePermissions (RenewalSourceId)
        WHERE RenewalSourceId IS NOT NULL
          AND Status IN (N'DRAFT', N'PENDING_APPROVAL');
END
GO

IF OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_DpEmpPerm_RenewalSource'
      AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions')
)
BEGIN
    CREATE INDEX IX_DpEmpPerm_RenewalSource
        ON dbo.DoctorEmployeeProfilePermissions (RenewalSourceId)
        WHERE RenewalSourceId IS NOT NULL;
END
GO

IF 1 = 0 AND OBJECT_ID(N'dbo.DoctorPermissionApprovalActions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionApprovalActions (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissionApprovalActions PRIMARY KEY,
        EmployeeProfilePermissionId INT NOT NULL,
        Action NVARCHAR(40) NOT NULL,
        PreviousStatus NVARCHAR(30) NULL,
        NewStatus NVARCHAR(30) NOT NULL,
        Comment NVARCHAR(1000) NULL,
        PerformedBy NVARCHAR(50) NOT NULL,
        PerformedAt DATETIME NOT NULL CONSTRAINT DF_DpApproval_At DEFAULT (GETDATE()),
        CONSTRAINT FK_DpApproval_Perm FOREIGN KEY (EmployeeProfilePermissionId) REFERENCES dbo.DoctorEmployeeProfilePermissions (Id)
    );
    CREATE INDEX IX_DpApproval_Perm ON dbo.DoctorPermissionApprovalActions (EmployeeProfilePermissionId, PerformedAt);
END
GO

IF OBJECT_ID(N'dbo.DoctorEmployeeNotes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorEmployeeNotes (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorEmployeeNotes PRIMARY KEY,
        EmployeeId NVARCHAR(50) NOT NULL,
        NoteText NVARCHAR(4000) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DpNotes_IsActive DEFAULT (1),
        CreatedBy NVARCHAR(50) NOT NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_DpNotes_CreatedAt DEFAULT (GETDATE()),
        UpdatedBy NVARCHAR(50) NULL,
        UpdatedAt DATETIME NULL
    );
    CREATE INDEX IX_DpNotes_Employee ON dbo.DoctorEmployeeNotes (EmployeeId, IsActive, CreatedAt);
END
GO

IF OBJECT_ID(N'dbo.DoctorEmployeeOrganizationalChanges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorEmployeeOrganizationalChanges (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorEmployeeOrganizationalChanges PRIMARY KEY,
        EmployeeId NVARCHAR(50) NOT NULL,
        ChangeType NVARCHAR(50) NOT NULL,
        FieldName NVARCHAR(50) NOT NULL,
        OldValue NVARCHAR(200) NULL,
        NewValue NVARCHAR(200) NULL,
        DetectedAt DATETIME NOT NULL CONSTRAINT DF_DpOrgChange_Detected DEFAULT (GETDATE()),
        ProcessedAt DATETIME NULL,
        ProcessingStatus NVARCHAR(30) NOT NULL,
        RelatedProfileId INT NULL
    );
    CREATE INDEX IX_DpOrgChange_Employee ON dbo.DoctorEmployeeOrganizationalChanges (EmployeeId, DetectedAt);
END
GO

IF OBJECT_ID(N'dbo.DoctorEmployeeOrgSnapshot', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorEmployeeOrgSnapshot (
        EmployeeId NVARCHAR(50) NOT NULL CONSTRAINT PK_DoctorEmployeeOrgSnapshot PRIMARY KEY,
        DepartnentCode NVARCHAR(50) NULL,
        FunctionID NVARCHAR(50) NULL,
        JobTitleID NVARCHAR(50) NULL,
        SnapshotAt DATETIME NOT NULL CONSTRAINT DF_DpOrgSnap_At DEFAULT (GETDATE())
    );
END
GO

IF OBJECT_ID(N'dbo.DoctorPermissionNotificationRules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionNotificationRules (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissionNotificationRules PRIMARY KEY,
        NotificationType NVARCHAR(40) NOT NULL,
        DayOffset INT NOT NULL,
        Channel NVARCHAR(10) NOT NULL CONSTRAINT DF_DpNotifRule_Channel DEFAULT (N'BOTH'),
        IsActive BIT NOT NULL CONSTRAINT DF_DpNotifRule_Active DEFAULT (1),
        CONSTRAINT UQ_DpNotifRule UNIQUE (NotificationType, DayOffset),
        CONSTRAINT CK_DpNotifRule_Day CHECK (DayOffset BETWEEN 0 AND 365),
        CONSTRAINT CK_DpNotifRule_Channel CHECK (Channel IN (N'EMAIL', N'SMS', N'BOTH'))
    );
END
GO

IF OBJECT_ID(N'dbo.DoctorPermissionNotifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionNotifications (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissionNotifications PRIMARY KEY,
        EmployeeProfilePermissionId INT NULL,
        RecipientEmployeeId NVARCHAR(50) NULL,
        Channel NVARCHAR(10) NOT NULL,
        NotificationType NVARCHAR(40) NOT NULL,
        DayOffset INT NOT NULL CONSTRAINT DF_DpNotif_Day DEFAULT (0),
        RecipientAddress NVARCHAR(200) NULL,
        Status NVARCHAR(20) NOT NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_DpNotif_Created DEFAULT (GETDATE()),
        SentAt DATETIME NULL,
        FailureReason NVARCHAR(500) NULL,
        RetryCount INT NOT NULL CONSTRAINT DF_DpNotif_Retry DEFAULT (0),
        CONSTRAINT CK_DpNotif_Status CHECK (Status IN (N'QUEUED', N'SENT', N'FAILED', N'SKIPPED'))
    );
    CREATE INDEX IX_DpNotif_Status ON dbo.DoctorPermissionNotifications (Status, CreatedAt);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DpNotif_Slot'
      AND object_id = OBJECT_ID(N'dbo.DoctorPermissionNotifications')
)
BEGIN
    CREATE UNIQUE INDEX UX_DpNotif_Slot
        ON dbo.DoctorPermissionNotifications (EmployeeProfilePermissionId, RecipientEmployeeId, NotificationType, DayOffset, Channel)
        WHERE EmployeeProfilePermissionId IS NOT NULL;
END
GO

IF OBJECT_ID(N'dbo.DoctorPermissionAuditLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionAuditLog (
        Id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissionAuditLog PRIMARY KEY,
        EntityType NVARCHAR(50) NOT NULL,
        EntityId NVARCHAR(50) NOT NULL,
        Action NVARCHAR(50) NOT NULL,
        OldValueJson NVARCHAR(MAX) NULL,
        NewValueJson NVARCHAR(MAX) NULL,
        PerformedBy NVARCHAR(50) NOT NULL,
        PerformedAt DATETIME NOT NULL CONSTRAINT DF_DpAudit_At DEFAULT (GETDATE()),
        Reason NVARCHAR(1000) NULL
    );
    CREATE INDEX IX_DpAudit_Entity ON dbo.DoctorPermissionAuditLog (EntityType, EntityId, PerformedAt);
    CREATE INDEX IX_DpAudit_Actor ON dbo.DoctorPermissionAuditLog (PerformedBy, PerformedAt);
END
GO

IF OBJECT_ID(N'dbo.DoctorPermissionUserRoles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionUserRoles (
        Id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_DoctorPermissionUserRoles PRIMARY KEY,
        EmployeeId NVARCHAR(50) NOT NULL,
        RoleCode NVARCHAR(30) NOT NULL,
        DepartnentCode NVARCHAR(50) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DpRoles_Active DEFAULT (1),
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_DpRoles_Created DEFAULT (GETDATE()),
        CreatedBy NVARCHAR(50) NULL,
        CONSTRAINT CK_DpRoles_Code CHECK (RoleCode IN (N'ADMIN', N'DEPARTMENT_MANAGER'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DpRole_Admin'
      AND object_id = OBJECT_ID(N'dbo.DoctorPermissionUserRoles')
)
BEGIN
    CREATE UNIQUE INDEX UX_DpRole_Admin
        ON dbo.DoctorPermissionUserRoles (EmployeeId)
        WHERE RoleCode = N'ADMIN' AND IsActive = 1;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_DpRole_Dept'
      AND object_id = OBJECT_ID(N'dbo.DoctorPermissionUserRoles')
)
BEGIN
    CREATE UNIQUE INDEX UX_DpRole_Dept
        ON dbo.DoctorPermissionUserRoles (EmployeeId, DepartnentCode)
        WHERE RoleCode = N'DEPARTMENT_MANAGER' AND IsActive = 1;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DoctorPermissionNotificationRules WHERE NotificationType = N'INITIAL_REQUEST')
    INSERT INTO dbo.DoctorPermissionNotificationRules (NotificationType, DayOffset, Channel, IsActive)
    VALUES (N'INITIAL_REQUEST', 0, N'BOTH', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.DoctorPermissionNotificationRules WHERE NotificationType = N'REMINDER' AND DayOffset = 3)
    INSERT INTO dbo.DoctorPermissionNotificationRules (NotificationType, DayOffset, Channel, IsActive)
    VALUES (N'REMINDER', 3, N'BOTH', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.DoctorPermissionNotificationRules WHERE NotificationType = N'REMINDER' AND DayOffset = 7)
    INSERT INTO dbo.DoctorPermissionNotificationRules (NotificationType, DayOffset, Channel, IsActive)
    VALUES (N'REMINDER', 7, N'BOTH', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.DoctorPermissionNotificationRules WHERE NotificationType = N'ESCALATION' AND DayOffset = 14)
    INSERT INTO dbo.DoctorPermissionNotificationRules (NotificationType, DayOffset, Channel, IsActive)
    VALUES (N'ESCALATION', 14, N'BOTH', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.DoctorPermissionNotificationRules WHERE NotificationType = N'RENEWAL_REQUEST')
    INSERT INTO dbo.DoctorPermissionNotificationRules (NotificationType, DayOffset, Channel, IsActive)
    VALUES (N'RENEWAL_REQUEST', 0, N'BOTH', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.DoctorPermissionNotificationRules WHERE NotificationType = N'EXPIRY_APPROACHING')
    INSERT INTO dbo.DoctorPermissionNotificationRules (NotificationType, DayOffset, Channel, IsActive)
    VALUES (N'EXPIRY_APPROACHING', 30, N'BOTH', 1);
GO

IF OBJECT_ID(N'dbo.DoctorPermissionProfileTemplates', N'U') IS NOT NULL
AND COL_LENGTH(N'dbo.DoctorPermissionProfileTemplates', N'Description') IS NULL
    ALTER TABLE dbo.DoctorPermissionProfileTemplates ADD Description NVARCHAR(500) NULL;
IF OBJECT_ID(N'dbo.DoctorPermissionProfileTemplates', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpTemplates_Dept' AND object_id = OBJECT_ID(N'dbo.DoctorPermissionProfileTemplates'))
    CREATE INDEX IX_DpTemplates_Dept ON dbo.DoctorPermissionProfileTemplates (DepartmentCode, IsActive);
IF OBJECT_ID(N'dbo.DoctorEmployeeProfiles', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpEmpProfiles_Employee' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfiles'))
    CREATE INDEX IX_DpEmpProfiles_Employee ON dbo.DoctorEmployeeProfiles (EmployeeId, IsActive);
IF OBJECT_ID(N'dbo.DoctorEmployeeProfiles', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpEmpProfiles_Dept' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfiles'))
    CREATE INDEX IX_DpEmpProfiles_Dept ON dbo.DoctorEmployeeProfiles (DepartmentCode, IsActive);
IF OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpEmpPerm_ProfileStatus' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions'))
    CREATE INDEX IX_DpEmpPerm_ProfileStatus ON dbo.DoctorEmployeeProfilePermissions (EmployeeProfileId, Status);
IF OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpEmpPerm_StatusExp' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions'))
    CREATE INDEX IX_DpEmpPerm_StatusExp ON dbo.DoctorEmployeeProfilePermissions (Status, ExpirationDate);
IF OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpEmpPerm_Permission' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions'))
    CREATE INDEX IX_DpEmpPerm_Permission ON dbo.DoctorEmployeeProfilePermissions (PermissionId, Status);
IF OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpEmpPerm_RenewalSource' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeProfilePermissions'))
    CREATE INDEX IX_DpEmpPerm_RenewalSource ON dbo.DoctorEmployeeProfilePermissions (RenewalSourceId) WHERE RenewalSourceId IS NOT NULL;
IF OBJECT_ID(N'dbo.DoctorPermissionApprovalActions', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpApproval_Perm' AND object_id = OBJECT_ID(N'dbo.DoctorPermissionApprovalActions'))
    CREATE INDEX IX_DpApproval_Perm ON dbo.DoctorPermissionApprovalActions (EmployeeProfilePermissionId, PerformedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpNotes_Employee' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeNotes'))
    CREATE INDEX IX_DpNotes_Employee ON dbo.DoctorEmployeeNotes (EmployeeId, IsActive, CreatedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpOrgChange_Employee' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeOrganizationalChanges'))
    CREATE INDEX IX_DpOrgChange_Employee ON dbo.DoctorEmployeeOrganizationalChanges (EmployeeId, DetectedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpOrgChange_Detected' AND object_id = OBJECT_ID(N'dbo.DoctorEmployeeOrganizationalChanges'))
    CREATE INDEX IX_DpOrgChange_Detected ON dbo.DoctorEmployeeOrganizationalChanges (DetectedAt, Id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpNotif_Status' AND object_id = OBJECT_ID(N'dbo.DoctorPermissionNotifications'))
    CREATE INDEX IX_DpNotif_Status ON dbo.DoctorPermissionNotifications (Status, CreatedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpNotif_Created' AND object_id = OBJECT_ID(N'dbo.DoctorPermissionNotifications'))
    CREATE INDEX IX_DpNotif_Created ON dbo.DoctorPermissionNotifications (CreatedAt, Id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpAudit_Entity' AND object_id = OBJECT_ID(N'dbo.DoctorPermissionAuditLog'))
    CREATE INDEX IX_DpAudit_Entity ON dbo.DoctorPermissionAuditLog (EntityType, EntityId, PerformedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_DpAudit_Actor' AND object_id = OBJECT_ID(N'dbo.DoctorPermissionAuditLog'))
    CREATE INDEX IX_DpAudit_Actor ON dbo.DoctorPermissionAuditLog (PerformedBy, PerformedAt);
GO

IF OBJECT_ID(N'dbo.DoctorPermissionSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.DoctorPermissionSettings (
        SettingKey NVARCHAR(50) NOT NULL CONSTRAINT PK_DpSettings PRIMARY KEY,
        SettingValue NVARCHAR(200) NOT NULL,
        UpdatedAt DATETIME NOT NULL CONSTRAINT DF_DpSettings_Updated DEFAULT (GETDATE()),
        UpdatedBy NVARCHAR(50) NULL
    );
END
GO

IF OBJECT_ID(N'dbo.DoctorPermissionSettings', N'U') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM dbo.DoctorPermissionSettings WHERE SettingKey = N'ApprovalDelayWarningDays')
    INSERT INTO dbo.DoctorPermissionSettings (SettingKey, SettingValue, UpdatedBy)
    VALUES (N'ApprovalDelayWarningDays', N'14', N'setup');
GO

/*
  First administrator. Replace the employee id, then run:

  INSERT INTO dbo.DoctorPermissionUserRoles (EmployeeId, RoleCode, DepartnentCode, IsActive, CreatedBy)
  VALUES (N'EMPLOYEE_ID_HERE', N'ADMIN', NULL, 1, N'setup');
*/
