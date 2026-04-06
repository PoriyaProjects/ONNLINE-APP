CREATE OR ALTER FUNCTION dbo.fn_EP_EmployeeEligibleProfiles
(
    @EmployeeID BIGINT,
    @AsOfDate   DATE
)
RETURNS @Out TABLE
(
    PermissionProfileID BIGINT NOT NULL PRIMARY KEY,
    MatchedRuleSetID    BIGINT NULL,
    EligibleVia         NVARCHAR(20) NOT NULL
)
AS
BEGIN
    /* @AsOfDate reserved for future as-of evaluation; active views use current date. */

    INSERT INTO @Out (PermissionProfileID, MatchedRuleSetID, EligibleVia)
    SELECT DISTINCT
           pp.PermissionProfileID,
           rs.RuleSetID,
           N'RULESET'
    FROM dbo.EP_PermissionProfiles AS pp
    INNER JOIN dbo.EP_PermissionProfileRuleSets AS rs
        ON rs.PermissionProfileIDFK = pp.PermissionProfileID
    WHERE pp.[Status] = 1
      AND rs.[Status] = 1
      AND rs.IsActive = 1
      AND dbo.fn_EP_RuleSetMatchesEmployee(rs.RuleSetID, @EmployeeID) = 1;

    INSERT INTO @Out (PermissionProfileID, MatchedRuleSetID, EligibleVia)
    SELECT DISTINCT
           r.PermissionProfileIDFK,
           NULL,
           N'LEGACY'
    FROM dbo.EP_PermissionProfileRules AS r
    WHERE r.[Status] = 1
      AND (
          r.DepartmentCode IS NULL
          OR EXISTS (
              SELECT 1
              FROM dbo.V_EP_ActiveEmployeeDepartments AS ed
              WHERE ed.EmployeeIDFK = @EmployeeID
                AND ed.DepartmentCode = r.DepartmentCode)
      )
      AND (
          r.EducationIDFK IS NULL
          OR EXISTS (
              SELECT 1
              FROM dbo.V_EP_ActiveEmployeeEducationSpecialties AS ees
              WHERE ees.EmployeeIDFK = @EmployeeID
                AND ees.EducationIDFK = r.EducationIDFK)
      )
      AND (
          r.SpecialtyIDFK IS NULL
          OR EXISTS (
              SELECT 1
              FROM dbo.V_EP_ActiveEmployeeEducationSpecialties AS ees2
              WHERE ees2.EmployeeIDFK = @EmployeeID
                AND ees2.SpecialtyIDFK = r.SpecialtyIDFK)
      )
      AND NOT EXISTS (
          SELECT 1
          FROM @Out AS o
          WHERE o.PermissionProfileID = r.PermissionProfileIDFK
      );

    RETURN;
END;
GO
