CREATE OR ALTER PROCEDURE dbo.sp_EP_ApplyManualAssignment
    @EmployeeID          BIGINT,
    @PermissionProfileID BIGINT,
    @ActorEmployeeIDFK   BIGINT,
    @AssignedReason      NVARCHAR(500) NULL,
    @ValidFrom           DATE NULL,
    @ValidTo             DATE NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @today DATE = CAST(GETDATE() AS DATE);

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.EP_PermissionProfiles AS pp
        WHERE pp.PermissionProfileID = @PermissionProfileID
          AND pp.[Status] = 1
    )
        THROW 50011, N'Permission profile not found or inactive.', 1;

    DECLARE @allowed BIT = 0;

    IF EXISTS (
        SELECT 1
        FROM dbo.EP_ApplicationUserRole AS ur
        INNER JOIN dbo.EP_ApplicationRole AS ar
            ON ar.ApplicationRoleId = ur.ApplicationRoleIdFK
        WHERE ur.UserEmployeeIDFK = @ActorEmployeeIDFK
          AND ur.[Status] = 1
          AND ar.[Status] = 1
          AND ar.RoleCode = N'GLOBAL_PERM_ADMIN'
    )
        SET @allowed = 1;

    IF @allowed = 0
       AND EXISTS (
           SELECT 1
           FROM dbo.EP_UserDepartmentScope AS s
           INNER JOIN dbo.V_EP_ActiveEmployeeDepartments AS ed
               ON ed.DepartmentCode = s.DepartmentCode
              AND ed.EmployeeIDFK = @EmployeeID
           WHERE s.UserEmployeeIDFK = @ActorEmployeeIDFK
             AND s.CanManage = 1
             AND s.[Status] = 1
       )
        SET @allowed = 1;

    IF @allowed = 0
        THROW 50012, N'Actor cannot assign permissions for this employee.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.EP_EmployeePermissionProfiles AS x
        WHERE x.EmployeeIDFK = @EmployeeID
          AND x.PermissionProfileIDFK = @PermissionProfileID
          AND x.[Status] = 1
          AND (x.ValidFrom IS NULL OR x.ValidFrom <= @today)
          AND (x.ValidTo IS NULL OR x.ValidTo >= @today)
    )
        THROW 50014, N'An active assignment already exists for this employee and profile.', 1;

    BEGIN TRANSACTION;

    /* Optional: deactivate conflicting AUTO for same profile */
    UPDATE dbo.EP_EmployeePermissionProfiles
    SET [Status] = 0
    WHERE EmployeeIDFK = @EmployeeID
      AND PermissionProfileIDFK = @PermissionProfileID
      AND AssignmentSource = N'AUTO'
      AND [Status] = 1;

    INSERT INTO dbo.EP_EmployeePermissionProfiles
    (
        EmployeeIDFK,
        PermissionProfileIDFK,
        AssignmentSource,
        AssignedAt,
        AssignedByEmployeeIDFK,
        AssignedReason,
        RuleSetIDFK,
        ValidFrom,
        ValidTo,
        IsOverride,
        OverriddenAssignmentIdFK,
        [Status]
    )
    VALUES
    (@EmployeeID, @PermissionProfileID, N'MANUAL', SYSDATETIME(), @ActorEmployeeIDFK, @AssignedReason, NULL,
     @ValidFrom, @ValidTo, 0, NULL, 1);

    DECLARE @newId BIGINT = SCOPE_IDENTITY();

    INSERT INTO dbo.EP_PermissionAssignmentAudit
    (
        EmployeeIDFK,
        EmployeePermissionProfileIDFK,
        PermissionProfileIDFK,
        ActionType,
        ActionByEmployeeIDFK,
        ActionReason,
        OldValuesJson,
        NewValuesJson
    )
    VALUES
    (
        @EmployeeID,
        @newId,
        @PermissionProfileID,
        N'ASSIGN',
        @ActorEmployeeIDFK,
        @AssignedReason,
        NULL,
        N'{"AssignmentSource":"MANUAL"}'
    );

    COMMIT TRANSACTION;
END;
GO
