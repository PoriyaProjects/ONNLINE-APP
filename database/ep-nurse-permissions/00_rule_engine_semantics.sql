/*
  EP nurse permission profiles — rule engine semantics (reference)

  Primary engine: EP_PermissionProfileRuleSets + EP_PermissionProfileRuleSetDetails
  - RuleSetLogic ALL: every active detail row must match the employee (AND across details).
  - RuleSetLogic ANY: at least one active detail must match (OR across details).
  - Multiple rule sets on one profile: OR — if any rule set matches, the profile is eligible from the structured engine.

  Legacy: EP_PermissionProfileRules
  - One row: non-null DepartmentCode, EducationIDFK, SpecialtyIDFK are combined with AND.
  - Multiple legacy rows for the same profile: OR.
  - Combined with structured engine: eligible = structuredMatch OR legacyMatch.

  Eligibility TVF: dbo.fn_EP_EmployeeEligibleProfiles uses V_EP_ActiveEmployeeDepartments and
  V_EP_ActiveEmployeeEducationSpecialties (as-of today in those views). For point-in-time history,
  replace view usage with date parameters in a copy of the logic.

  Assignments: EP_EmployeePermissionProfiles.AssignmentSource AUTO | MANUAL | OVERRIDE
  - Recalculation only adds/removes AUTO rows; never deletes MANUAL/OVERRIDE.
  - Do not insert AUTO if an active MANUAL or OVERRIDE exists for the same (Employee, Profile).
*/
