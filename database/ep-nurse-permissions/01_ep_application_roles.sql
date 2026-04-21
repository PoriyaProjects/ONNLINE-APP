/* Application authorization (separate from EP_Permissions / clinical profiles). */

IF OBJECT_ID(N'dbo.EP_ApplicationRole', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EP_ApplicationRole
    (
        ApplicationRoleId   BIGINT IDENTITY(1, 1) NOT NULL
            CONSTRAINT PK_EP_ApplicationRole PRIMARY KEY,
        RoleCode            NVARCHAR(80) NOT NULL,
        RoleName            NVARCHAR(200) NOT NULL,
        [Description]       NVARCHAR(500) NULL,
        [Status]            BIT NOT NULL
            CONSTRAINT DF_EP_ApplicationRole_Status DEFAULT (1),

        CONSTRAINT UQ_EP_ApplicationRole_RoleCode UNIQUE (RoleCode)
    );
END;
GO

IF OBJECT_ID(N'dbo.EP_ApplicationUserRole', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EP_ApplicationUserRole
    (
        ApplicationUserRoleId BIGINT IDENTITY(1, 1) NOT NULL
            CONSTRAINT PK_EP_ApplicationUserRole PRIMARY KEY,
        UserEmployeeIDFK      BIGINT NOT NULL,
        ApplicationRoleIdFK   BIGINT NOT NULL,
        [Status]              BIT NOT NULL
            CONSTRAINT DF_EP_ApplicationUserRole_Status DEFAULT (1),

        CONSTRAINT UQ_EP_ApplicationUserRole_User_Role
            UNIQUE (UserEmployeeIDFK, ApplicationRoleIdFK),

        CONSTRAINT FK_EP_ApplicationUserRole_Role
            FOREIGN KEY (ApplicationRoleIdFK) REFERENCES dbo.EP_ApplicationRole (ApplicationRoleId)
    );

    CREATE INDEX IX_EP_ApplicationUserRole_User
    ON dbo.EP_ApplicationUserRole (UserEmployeeIDFK, [Status]);
END;
GO

/* Seed roles (idempotent) */
IF NOT EXISTS (SELECT 1 FROM dbo.EP_ApplicationRole WHERE RoleCode = N'GLOBAL_PERM_ADMIN')
    INSERT INTO dbo.EP_ApplicationRole (RoleCode, RoleName, [Description], [Status])
    VALUES (N'GLOBAL_PERM_ADMIN', N'Global permissions admin', N'Full nurse-permissions management', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.EP_ApplicationRole WHERE RoleCode = N'PERM_DEPT_MANAGER')
    INSERT INTO dbo.EP_ApplicationRole (RoleCode, RoleName, [Description], [Status])
    VALUES (N'PERM_DEPT_MANAGER', N'Department permissions manager', N'Scoped by EP_UserDepartmentScope', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.EP_ApplicationRole WHERE RoleCode = N'PERM_READ_ALL')
    INSERT INTO dbo.EP_ApplicationRole (RoleCode, RoleName, [Description], [Status])
    VALUES (N'PERM_READ_ALL', N'Read all (no mutations)', NULL, 1);

IF NOT EXISTS (SELECT 1 FROM dbo.EP_ApplicationRole WHERE RoleCode = N'PERM_READ_SCOPED')
    INSERT INTO dbo.EP_ApplicationRole (RoleCode, RoleName, [Description], [Status])
    VALUES (N'PERM_READ_SCOPED', N'Read scoped departments', NULL, 1);
GO
