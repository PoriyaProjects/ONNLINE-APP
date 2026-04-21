CREATE OR ALTER FUNCTION dbo.fn_EP_RuleSetMatchesEmployee
(
    @RuleSetID  BIGINT,
    @EmployeeID BIGINT
)
RETURNS BIT
AS
BEGIN
    DECLARE @logic NVARCHAR(10);

    SELECT @logic = rs.RuleSetLogic
    FROM dbo.EP_PermissionProfileRuleSets AS rs
    WHERE rs.RuleSetID = @RuleSetID
      AND rs.[Status] = 1
      AND rs.IsActive = 1;

    IF @logic IS NULL
        RETURN 0;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.EP_PermissionProfileRuleSetDetails AS d
        WHERE d.RuleSetIDFK = @RuleSetID
          AND d.[Status] = 1
    )
        RETURN 0;

    IF @logic = N'ALL'
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.EP_PermissionProfileRuleSetDetails AS d
            WHERE d.RuleSetIDFK = @RuleSetID
              AND d.[Status] = 1
              AND NOT (
                  (d.RuleType = N'DEPARTMENT'
                   AND EXISTS (
                       SELECT 1
                       FROM dbo.V_EP_ActiveEmployeeDepartments AS ed
                       WHERE ed.EmployeeIDFK = @EmployeeID
                         AND ed.DepartmentCode = d.RuleValueID))
                  OR (d.RuleType = N'EDUCATION'
                      AND EXISTS (
                          SELECT 1
                          FROM dbo.V_EP_ActiveEmployeeEducationSpecialties AS ees
                          WHERE ees.EmployeeIDFK = @EmployeeID
                            AND ees.EducationIDFK = d.RuleValueID))
                  OR (d.RuleType = N'SPECIALTY'
                      AND EXISTS (
                          SELECT 1
                          FROM dbo.V_EP_ActiveEmployeeEducationSpecialties AS ees2
                          WHERE ees2.EmployeeIDFK = @EmployeeID
                            AND ees2.SpecialtyIDFK = d.RuleValueID))
              )
        )
            RETURN 0;

        RETURN 1;
    END;

    IF @logic = N'ANY'
    BEGIN
        IF EXISTS (
            SELECT 1
            FROM dbo.EP_PermissionProfileRuleSetDetails AS d
            WHERE d.RuleSetIDFK = @RuleSetID
              AND d.[Status] = 1
              AND (
                  (d.RuleType = N'DEPARTMENT'
                   AND EXISTS (
                       SELECT 1
                       FROM dbo.V_EP_ActiveEmployeeDepartments AS ed
                       WHERE ed.EmployeeIDFK = @EmployeeID
                         AND ed.DepartmentCode = d.RuleValueID))
                  OR (d.RuleType = N'EDUCATION'
                      AND EXISTS (
                          SELECT 1
                          FROM dbo.V_EP_ActiveEmployeeEducationSpecialties AS ees
                          WHERE ees.EmployeeIDFK = @EmployeeID
                            AND ees.EducationIDFK = d.RuleValueID))
                  OR (d.RuleType = N'SPECIALTY'
                      AND EXISTS (
                          SELECT 1
                          FROM dbo.V_EP_ActiveEmployeeEducationSpecialties AS ees2
                          WHERE ees2.EmployeeIDFK = @EmployeeID
                            AND ees2.SpecialtyIDFK = d.RuleValueID))
              )
        )
            RETURN 1;

        RETURN 0;
    END;

    RETURN 0;
END;
GO
