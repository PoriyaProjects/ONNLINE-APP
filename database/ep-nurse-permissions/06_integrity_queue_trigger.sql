/*
  Run after EP_EmployeePermissionProfiles exists.
  - Filtered unique: one active row per (employee, profile).
  - Recalculation queue for async/bulk.
  - Trigger: IsOverride + OverriddenAssignmentIdFK must reference an AUTO row.
*/

IF OBJECT_ID(N'dbo.EP_PermissionRecalculationQueue', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EP_PermissionRecalculationQueue
    (
        QueueId      BIGINT IDENTITY(1, 1) NOT NULL
            CONSTRAINT PK_EP_PermissionRecalculationQueue PRIMARY KEY,
        EmployeeIDFK BIGINT NOT NULL,
        EnqueuedAt   DATETIME2(0) NOT NULL
            CONSTRAINT DF_EP_PermissionRecalculationQueue_Enqueued DEFAULT (SYSDATETIME()),
        [Status]     NVARCHAR(20) NOT NULL
            CONSTRAINT DF_EP_PermissionRecalculationQueue_Status DEFAULT (N'PENDING'),
        PayloadJson  NVARCHAR(MAX) NULL
    );

    CREATE INDEX IX_EP_PermissionRecalculationQueue_Status
    ON dbo.EP_PermissionRecalculationQueue ([Status], EnqueuedAt);
END;
GO

/* Filtered unique — drop first if recreating */
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_EP_EmployeePermissionProfiles_Active_Employee_Profile'
      AND object_id = OBJECT_ID(N'dbo.EP_EmployeePermissionProfiles')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UX_EP_EmployeePermissionProfiles_Active_Employee_Profile
    ON dbo.EP_EmployeePermissionProfiles (EmployeeIDFK, PermissionProfileIDFK)
    WHERE [Status] = 1;
END;
GO

IF OBJECT_ID(N'dbo.trg_EP_EmployeePermissionProfiles_OverrideConsistency', N'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_EP_EmployeePermissionProfiles_OverrideConsistency;
GO

CREATE TRIGGER dbo.trg_EP_EmployeePermissionProfiles_OverrideConsistency
ON dbo.EP_EmployeePermissionProfiles
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN dbo.EP_EmployeePermissionProfiles AS base
            ON base.EmployeePermissionProfileID = i.OverriddenAssignmentIdFK
        WHERE i.IsOverride = 1
          AND i.OverriddenAssignmentIdFK IS NOT NULL
          AND base.AssignmentSource <> N'AUTO'
    )
    BEGIN
        THROW 50013, N'OverriddenAssignmentIdFK must reference an AUTO assignment row.', 1;
    END;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_EP_PermissionAssignmentAudit_ActionBy'
      AND object_id = OBJECT_ID(N'dbo.EP_PermissionAssignmentAudit')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_EP_PermissionAssignmentAudit_ActionBy
    ON dbo.EP_PermissionAssignmentAudit (ActionByEmployeeIDFK, ActionAt DESC);
END;
GO
