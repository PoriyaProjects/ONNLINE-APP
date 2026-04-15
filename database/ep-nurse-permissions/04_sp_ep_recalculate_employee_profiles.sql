CREATE OR ALTER PROCEDURE dbo.sp_EP_RecalculateEmployeePermissionProfiles
    @EmployeeID        BIGINT,
    @ActorEmployeeIDFK BIGINT NULL,
    @Reason            NVARCHAR(500) NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @today DATE = CAST(GETDATE() AS DATE);

    /* Access: global admin OR department overlap via EP_UserDepartmentScope */
    IF @ActorEmployeeIDFK IS NOT NULL
    BEGIN
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
        BEGIN
            THROW 50010, N'Actor cannot manage this employee.', 1;
        END;
    END;

    DECLARE @eligible TABLE
    (
        PermissionProfileID BIGINT NOT NULL PRIMARY KEY
    );

    INSERT INTO @eligible (PermissionProfileID)
    SELECT e.PermissionProfileID
    FROM dbo.fn_EP_EmployeeEligibleProfiles(@EmployeeID, @today) AS e;

    BEGIN TRANSACTION;

    /* Remove AUTO assignments that are no longer eligible */
    UPDATE epp
    SET [Status] = 0
    FROM dbo.EP_EmployeePermissionProfiles AS epp
    WHERE epp.EmployeeIDFK = @EmployeeID
      AND epp.AssignmentSource = N'AUTO'
      AND epp.[Status] = 1
      AND (epp.ValidFrom IS NULL OR epp.ValidFrom <= @today)
      AND (epp.ValidTo IS NULL OR epp.ValidTo >= @today)
      AND NOT EXISTS (
          SELECT 1
          FROM @eligible AS e
          WHERE e.PermissionProfileID = epp.PermissionProfileIDFK
      );

    /* Add AUTO rows for newly eligible profiles */
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
    SELECT
        @EmployeeID,
        e.PermissionProfileID,
        N'AUTO',
        SYSDATETIME(),
        NULL,
        @Reason,
        NULL,
        NULL,
        NULL,
        0,
        NULL,
        1
    FROM @eligible AS e
    WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.EP_EmployeePermissionProfiles AS x
        WHERE x.EmployeeIDFK = @EmployeeID
          AND x.PermissionProfileIDFK = e.PermissionProfileID
          AND x.[Status] = 1
          AND (x.ValidFrom IS NULL OR x.ValidFrom <= @today)
          AND (x.ValidTo IS NULL OR x.ValidTo >= @today)
    )
      AND NOT EXISTS (
        SELECT 1
        FROM dbo.EP_EmployeePermissionProfiles AS x
        WHERE x.EmployeeIDFK = @EmployeeID
          AND x.PermissionProfileIDFK = e.PermissionProfileID
          AND x.[Status] = 1
          AND x.AssignmentSource IN (N'MANUAL', N'OVERRIDE')
      );

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
    (@EmployeeID, NULL, NULL, N'RECALCULATE', @ActorEmployeeIDFK, @Reason, NULL, NULL);

    COMMIT TRANSACTION;
END;
GO
