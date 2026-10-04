/*
================================================================================
Training Management — single install script (simple)
================================================================================
Target: run in Forms (or your Training DB). Adjust USE below if needed.

Existing people tables (do NOT recreate):
  NAMER.dbo.EP_Employees
    RowID, EmployeeID (unique), FirstName, LastName, ADUserName,
    Email, PersonalEmail, CellNumber, DepartnentCode, EndWorkDate
  NAMER.dbo.EP_Departnents
    DepartnentCode, DepartnentDescripton

Active employee filter used in joins:
  EndWorkDate IS NULL AND EmployeeID NOT LIKE '00000%'

No FOREIGN KEY / CHECK / UNIQUE constraints on Training tables (per request).
Only Id INT IDENTITY PRIMARY KEY on each table.

Status INT (app codes):
  Course: 0 Inactive, 1 Active, 2 Draft
  Session: 0 Cancelled, 1 Open, 2 Full, 3 Completed, 4 Draft, 5 Closed
  Registration: 0 Cancelled, 1 Registered, 2 Attended, 3 Absent, 4 Completed
  Attendance: 0 Revoked, 1 Confirmed, 2 Pending, 3 ManuallyConfirmed
  Certificate: 0 Void, 1 Issued, 2 Expired, 3 Pending, 4 Sent, 5 Failed
  Notification: 0 Pending, 1 Sent, 2 Failed, 3 Skipped

QR: store TokenHash only (C# sends hash). Raw token is never stored.

Envelope (last result set on each proc):
  Success, ErrorCode, Message, CorrelationId, TotalCount, EntityId
================================================================================
*/
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

USE [Forms];  /* change if Training tables live elsewhere */
GO


/* ========== TABLES ========== */

IF OBJECT_ID(N'dbo.TrainingCourses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingCourses (
        Id                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Code                NVARCHAR(50)  NOT NULL,
        Name                NVARCHAR(200) NOT NULL,
        Description         NVARCHAR(4000) NULL,
        CourseType          NVARCHAR(100) NULL,
        DurationMinutes     INT NULL,
        ValidityMonths      INT NULL,
        IsMandatory         BIT NOT NULL DEFAULT (0),
        GeneratesCertificate BIT NOT NULL DEFAULT (1),
        Status              INT NOT NULL DEFAULT (1),
        InsertedAt          DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        UpdatedAt           DATETIME2(3) NULL,
        CreatedByEmployeeID NVARCHAR(50) NULL,
        UpdatedByEmployeeID NVARCHAR(50) NULL
    );
END
GO

IF OBJECT_ID(N'dbo.TrainingCourseSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingCourseSessions (
        Id                           INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        CourseId                     INT NOT NULL,
        SessionDate                  DATE NOT NULL,
        StartTime                    TIME(0) NOT NULL,
        EndTime                      TIME(0) NOT NULL,
        Location                     NVARCHAR(200) NULL,
        LecturerEmployeeID           NVARCHAR(50) NOT NULL,
        Capacity                     INT NOT NULL,
        RegistrationCloseAt          DATETIME2(3) NOT NULL,
        AttendanceOpenAt             DATETIME2(3) NULL,
        AttendanceCloseAt            DATETIME2(3) NULL,
        AttendanceWindowOpen         BIT NOT NULL DEFAULT (0),
        AttendanceWindowOpenedAt     DATETIME2(3) NULL,
        AttendanceWindowClosedAt     DATETIME2(3) NULL,
        AttendanceOpenedByEmployeeID NVARCHAR(50) NULL,
        AttendanceClosedByEmployeeID NVARCHAR(50) NULL,
        QrTokenHash                  NVARCHAR(128) NULL,
        QrTokenExpiresAt             DATETIME2(3) NULL,
        Status                       INT NOT NULL DEFAULT (1),
        CancelReason                 NVARCHAR(500) NULL,
        CancelledAt                  DATETIME2(3) NULL,
        CancelledByEmployeeID        NVARCHAR(50) NULL,
        CompletedAt                  DATETIME2(3) NULL,
        CompletedByEmployeeID        NVARCHAR(50) NULL,
        InsertedAt                   DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        UpdatedAt                    DATETIME2(3) NULL,
        CreatedByEmployeeID          NVARCHAR(50) NULL,
        UpdatedByEmployeeID          NVARCHAR(50) NULL
    );
END
GO

IF COL_LENGTH(N'dbo.TrainingCourseSessions', N'AttendanceOpenAt') IS NULL
BEGIN
    ALTER TABLE dbo.TrainingCourseSessions ADD AttendanceOpenAt DATETIME2(3) NULL;
END
GO

IF COL_LENGTH(N'dbo.TrainingCourseSessions', N'AttendanceCloseAt') IS NULL
BEGIN
    ALTER TABLE dbo.TrainingCourseSessions ADD AttendanceCloseAt DATETIME2(3) NULL;
END
GO

IF OBJECT_ID(N'dbo.TrainingRegistrations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingRegistrations (
        Id                     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        SessionId              INT NOT NULL,
        EmployeeID             NVARCHAR(50) NOT NULL,
        Status                 INT NOT NULL DEFAULT (1),
        RegisteredAt           DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        RegisteredByEmployeeID NVARCHAR(50) NULL,
        IsAdministrative       BIT NOT NULL DEFAULT (0),
        CancelledAt            DATETIME2(3) NULL,
        CancellationReason     NVARCHAR(500) NULL,
        CancelledByEmployeeID  NVARCHAR(50) NULL,
        InsertedAt             DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        UpdatedAt              DATETIME2(3) NULL,
        CreatedByEmployeeID    NVARCHAR(50) NULL,
        UpdatedByEmployeeID    NVARCHAR(50) NULL
    );
END
GO

IF OBJECT_ID(N'dbo.TrainingAttendance', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingAttendance (
        Id                    INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        RegistrationId        INT NOT NULL,
        SessionId             INT NOT NULL,
        EmployeeID            NVARCHAR(50) NOT NULL,
        Source                INT NOT NULL,          /* 1 QR, 2 Manual */
        Status                INT NOT NULL DEFAULT (1),
        ConfirmedAt           DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        ConfirmedByEmployeeID NVARCHAR(50) NULL,
        IdentityEntered       NVARCHAR(50) NULL,
        IsManualUpdate        BIT NOT NULL DEFAULT (0),
        ManualReason          NVARCHAR(500) NULL,
        InsertedAt            DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        UpdatedAt             DATETIME2(3) NULL,
        CreatedByEmployeeID   NVARCHAR(50) NULL,
        UpdatedByEmployeeID   NVARCHAR(50) NULL
    );
END
GO

IF OBJECT_ID(N'dbo.TrainingCertificates', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingCertificates (
        Id                     INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        AttendanceId           INT NOT NULL,
        RegistrationId         INT NOT NULL,
        SessionId              INT NOT NULL,
        CourseId               INT NOT NULL,
        EmployeeID             NVARCHAR(50) NOT NULL,
        CertificateNumber      NVARCHAR(50) NOT NULL,
        IssuedAt               DATETIME2(3) NULL,
        ExpiresAt              DATETIME2(3) NULL,
        FilePath               NVARCHAR(500) NULL,
        FileHash               NVARCHAR(128) NULL,
        FileName               NVARCHAR(260) NULL,
        ContentType            NVARCHAR(100) NULL,
        Status                 INT NOT NULL DEFAULT (3),
        EmailStatus            INT NULL,
        EmailSentAt            DATETIME2(3) NULL,
        GenerationAttemptCount INT NOT NULL DEFAULT (0),
        EmailAttemptCount      INT NOT NULL DEFAULT (0),
        LastErrorCode          NVARCHAR(100) NULL,
        LastSafeErrorMessage   NVARCHAR(1000) NULL,
        CancelledAt            DATETIME2(3) NULL,
        CancelledByEmployeeID  NVARCHAR(50) NULL,
        InsertedAt             DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        UpdatedAt              DATETIME2(3) NULL,
        CreatedByEmployeeID    NVARCHAR(50) NULL,
        UpdatedByEmployeeID    NVARCHAR(50) NULL
    );
END
GO

IF OBJECT_ID(N'dbo.TrainingNotifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingNotifications (
        Id               INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        NotificationType INT NOT NULL,   /* 1 Reminder, 2 CertEmail, 3 SessionCancelled, 4 RegistrationConfirmation; Channel: 1 Email, 2 Internal, 3 SMS */
        Channel          INT NOT NULL DEFAULT (1),
        SessionId        INT NULL,
        RegistrationId   INT NULL,
        CertificateId    INT NULL,
        CourseId         INT NULL,
        EmployeeID       NVARCHAR(50) NOT NULL,
        Status           INT NOT NULL DEFAULT (0),
        ScheduledAt      DATETIME2(3) NULL,
        AttemptCount     INT NOT NULL DEFAULT (0),
        LastAttemptAt    DATETIME2(3) NULL,
        SentAt           DATETIME2(3) NULL,
        LastErrorCode    NVARCHAR(100) NULL,
        LastError        NVARCHAR(1000) NULL,
        CorrelationId    NVARCHAR(32) NULL,
        PayloadJson      NVARCHAR(4000) NULL,
        InsertedAt       DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        UpdatedAt        DATETIME2(3) NULL,
        CreatedByEmployeeID NVARCHAR(50) NULL,
        UpdatedByEmployeeID NVARCHAR(50) NULL
    );
END
GO

IF OBJECT_ID(N'dbo.TrainingAuditLog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrainingAuditLog (
        Id                    BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        EntityType            NVARCHAR(50) NOT NULL,
        EntityId              INT NOT NULL,
        ActionType            NVARCHAR(50) NOT NULL,
        PreviousValueJson     NVARCHAR(4000) NULL,
        NewValueJson          NVARCHAR(4000) NULL,
        Reason                NVARCHAR(500) NULL,
        PerformedByEmployeeID NVARCHAR(50) NULL,
        PerformedByUserName   NVARCHAR(100) NULL,
        PerformedAt           DATETIME2(3) NOT NULL DEFAULT (GETDATE()),
        CorrelationId         NVARCHAR(32) NULL,
        SafeMetadataJson      NVARCHAR(4000) NULL
    );
END
GO

PRINT 'Tables ready.';
GO


CREATE OR ALTER FUNCTION dbo.fn_Training_EmpName (@EmployeeID NVARCHAR(50))
RETURNS NVARCHAR(300)
AS
BEGIN
    DECLARE @N NVARCHAR(300);
    SELECT @N = LTRIM(RTRIM(ISNULL(FirstName,N'') + N' ' + ISNULL(LastName,N'')))
    FROM NAMER.dbo.EP_Employees
    WHERE EmployeeID = @EmployeeID
      AND EndWorkDate IS NULL
      AND EmployeeID NOT LIKE N'00000%';
    RETURN NULLIF(@N, N'');
END
GO

CREATE OR ALTER FUNCTION dbo.fn_Training_EmpExists (@EmployeeID NVARCHAR(50))
RETURNS BIT
AS
BEGIN
    IF EXISTS (
        SELECT 1 FROM NAMER.dbo.EP_Employees
        WHERE EmployeeID = @EmployeeID
          AND EndWorkDate IS NULL
          AND EmployeeID NOT LIKE N'00000%'
    ) RETURN 1;
    RETURN 0;
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_Audit_Insert
    @EntityType NVARCHAR(50),
    @EntityId INT,
    @ActionType NVARCHAR(50),
    @Reason NVARCHAR(500) = NULL,
    @PerformedByEmployeeID NVARCHAR(50) = NULL,
    @CorrelationId NVARCHAR(32) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.TrainingAuditLog (EntityType, EntityId, ActionType, Reason, PerformedByEmployeeID, CorrelationId)
    VALUES (@EntityType, @EntityId, @ActionType, @Reason, @PerformedByEmployeeID, @CorrelationId);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetAvailableCourses
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        SELECT
            c.Id, c.Code, c.Name, c.CourseType, c.DurationMinutes, c.ValidityMonths,
            c.IsMandatory, c.Status, c.Description,
            (SELECT COUNT(*) FROM dbo.TrainingCourseSessions s
             WHERE s.CourseId = c.Id AND s.Status IN (1, 2) AND s.SessionDate >= CAST(GETDATE() AS DATE)) AS UpcomingSessionsCount,
            CONVERT(NVARCHAR(30),
                (SELECT MIN(s.SessionDate) FROM dbo.TrainingCourseSessions s
                 WHERE s.CourseId = c.Id AND s.Status IN (1, 2) AND s.SessionDate >= CAST(GETDATE() AS DATE)), 23) AS NearestSessionDate,
            CAST(NULL AS NVARCHAR(200)) AS NearestSessionLocation,
            CAST(1 AS BIT) AS HasAvailablePlaces
        FROM dbo.TrainingCourses c
        WHERE c.Status = 1
        ORDER BY c.Name;

        SET @TotalCount = @@ROWCOUNT;
        SET @Success = 1;
        SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT';
        SET @Message = N'Unable to load courses.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetCourseSessions
    @CourseId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @CourseId IS NULL OR @CourseId <= 0
        BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'CourseId required.'; GOTO DoneMeta; END

        SELECT
            s.Id, s.CourseId, c.Code AS CourseCode, c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(8), s.StartTime, 108) AS StartTime,
            CONVERT(NVARCHAR(8), s.EndTime, 108) AS EndTime,
            s.Location, s.LecturerEmployeeID,
            dbo.fn_Training_EmpName(s.LecturerEmployeeID) AS LecturerName,
            s.Capacity,
            (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4)) AS RegisteredCount,
            s.Capacity - (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4)) AS AvailablePlaces,
            CONVERT(NVARCHAR(30), s.RegistrationCloseAt, 126) AS RegistrationCloseAt,
            s.Status,
            CAST(0 AS BIT) AS IsRegisteredByCurrentEmployee,
            CAST(CASE
                WHEN c.Status = 1
                 AND s.Status = 1
                 AND s.RegistrationCloseAt > GETDATE()
                 AND s.Capacity > (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4))
                THEN 1 ELSE 0 END AS BIT) AS CanRegister,
            CAST(NULL AS INT) AS CanCancelRegistrationId
        FROM dbo.TrainingCourseSessions s
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE s.CourseId = @CourseId
        ORDER BY s.SessionDate, s.StartTime;

        SET @TotalCount = @@ROWCOUNT;
        SET @Success = 1;
        SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load sessions.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_RegisterEmployeeToSession
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50),
    @TargetEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    DECLARE @Capacity INT, @Status INT, @CloseAt DATETIME2(3), @Cnt INT, @CourseStatus INT;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @TargetEmployeeID IS NULL OR LTRIM(RTRIM(@TargetEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_VALIDATION_FAILED';
            SET @Message = N'Target employee is required.';
            GOTO DoneMeta;
        END

        IF dbo.fn_Training_EmpExists(@ActingEmployeeID) = 0
        BEGIN SET @ErrorCode = N'TRAINING_EMPLOYEE_NOT_FOUND'; SET @Message = N'Acting employee not found.'; GOTO DoneMeta; END

        IF dbo.fn_Training_EmpExists(@TargetEmployeeID) = 0
        BEGIN SET @ErrorCode = N'TRAINING_EMPLOYEE_NOT_FOUND'; SET @Message = N'Target employee not found.'; GOTO DoneMeta; END

        IF @SessionId IS NULL OR @SessionId <= 0
        BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'SessionId required.'; GOTO DoneMeta; END

        BEGIN TRAN;

        SELECT @Capacity = s.Capacity, @Status = s.Status, @CloseAt = s.RegistrationCloseAt, @CourseStatus = c.Status
        FROM dbo.TrainingCourseSessions s
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE s.Id = @SessionId;

        IF @Capacity IS NULL
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; ROLLBACK TRAN; GOTO DoneMeta; END

        IF @CourseStatus <> 1 OR @Status NOT IN (1, 2)
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_OPEN'; SET @Message = N'Session not open.'; ROLLBACK TRAN; GOTO DoneMeta; END

        IF @CloseAt <= GETDATE()
        BEGIN SET @ErrorCode = N'TRAINING_REGISTRATION_CLOSED'; SET @Message = N'Registration closed.'; ROLLBACK TRAN; GOTO DoneMeta; END

        IF EXISTS (SELECT 1 FROM dbo.TrainingRegistrations WHERE SessionId = @SessionId AND EmployeeID = @TargetEmployeeID AND Status IN (1,2,3,4))
        BEGIN SET @ErrorCode = N'TRAINING_ALREADY_REGISTERED'; SET @Message = N'Already registered.'; ROLLBACK TRAN; GOTO DoneMeta; END

        SELECT @Cnt = COUNT(*) FROM dbo.TrainingRegistrations WHERE SessionId = @SessionId AND Status IN (1,2,3,4);
        IF @Cnt >= @Capacity OR @Status = 2
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_FULL'; SET @Message = N'Session full.'; ROLLBACK TRAN; GOTO DoneMeta; END

        INSERT INTO dbo.TrainingRegistrations (SessionId, EmployeeID, Status, RegisteredByEmployeeID, CreatedByEmployeeID)
        VALUES (@SessionId, @TargetEmployeeID, 1, @ActingEmployeeID, @ActingEmployeeID);
        SET @EntityId = SCOPE_IDENTITY();

        IF @Cnt + 1 >= @Capacity
            UPDATE dbo.TrainingCourseSessions SET Status = 2, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID WHERE Id = @SessionId;

        EXEC dbo.usp_Training_Audit_Insert N'Registration', @EntityId, N'Register', NULL, @ActingEmployeeID, @CorrelationId;
        COMMIT TRAN;

        SELECT @EntityId AS RegistrationId, @SessionId AS SessionId, 1 AS Status;
        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Registration failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_CancelEmployeeRegistration
    @RegistrationId INT,
    @Reason NVARCHAR(500) = NULL,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    DECLARE @SessionId INT, @Emp NVARCHAR(50), @St INT, @Capacity INT, @Cnt INT, @SessStatus INT, @CloseAt DATETIME2(3);

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        BEGIN TRAN;
        SELECT @SessionId = SessionId, @Emp = EmployeeID, @St = Status
        FROM dbo.TrainingRegistrations WHERE Id = @RegistrationId;

        IF @SessionId IS NULL
        BEGIN SET @ErrorCode = N'TRAINING_REGISTRATION_NOT_FOUND'; SET @Message = N'Registration not found.'; ROLLBACK TRAN; GOTO DoneMeta; END
        IF @St = 0
        BEGIN SET @ErrorCode = N'TRAINING_CANCELLATION_NOT_ALLOWED'; SET @Message = N'Already cancelled.'; ROLLBACK TRAN; GOTO DoneMeta; END
        /* Ownership (direct manager / admin) enforced in C# TrainingManagementService. */

        UPDATE dbo.TrainingRegistrations
        SET Status = 0, CancelledAt = GETDATE(), CancellationReason = @Reason,
            CancelledByEmployeeID = @ActingEmployeeID, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @RegistrationId;

        SELECT @Capacity = Capacity, @SessStatus = Status, @CloseAt = RegistrationCloseAt
        FROM dbo.TrainingCourseSessions WHERE Id = @SessionId;

        SELECT @Cnt = COUNT(*) FROM dbo.TrainingRegistrations WHERE SessionId = @SessionId AND Status IN (1,2,3,4);

        /* reopen Full -> Open when a seat frees and registration still open */
        IF @SessStatus = 2 AND @CloseAt > GETDATE() AND @Cnt < @Capacity
            UPDATE dbo.TrainingCourseSessions
            SET Status = 1, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
            WHERE Id = @SessionId AND Status = 2;

        EXEC dbo.usp_Training_Audit_Insert N'Registration', @RegistrationId, N'Cancel', @Reason, @ActingEmployeeID, @CorrelationId;
        COMMIT TRAN;

        SET @EntityId = @RegistrationId;
        SELECT @RegistrationId AS RegistrationId, 0 AS Status;
        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Cancel failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetEmployeeRegistrations
    @ActingEmployeeID NVARCHAR(50),
    @EmployeeID NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        /* @EmployeeID set: single employee. Null/empty: all direct reports (ManagerID1). */

        SELECT
            r.Id, r.SessionId, c.Id AS CourseId, c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(8), s.StartTime, 108) AS StartTime,
            CONVERT(NVARCHAR(8), s.EndTime, 108) AS EndTime,
            s.Location, r.EmployeeID,
            dbo.fn_Training_EmpName(r.EmployeeID) AS EmployeeFullName,
            CONVERT(NVARCHAR(30), r.RegisteredAt, 126) AS RegisteredAt,
            r.Status,
            CONVERT(NVARCHAR(30), r.CancelledAt, 126) AS CancelledAt,
            r.CancellationReason,
            (SELECT TOP 1 a.Status FROM dbo.TrainingAttendance a WHERE a.RegistrationId = r.Id ORDER BY a.Id DESC) AS AttendanceStatus,
            (SELECT TOP 1 cert.Status FROM dbo.TrainingCertificates cert WHERE cert.RegistrationId = r.Id ORDER BY cert.Id DESC) AS CertificateStatus
        FROM dbo.TrainingRegistrations r
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = r.SessionId
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE (
            (@EmployeeID IS NOT NULL AND LTRIM(RTRIM(@EmployeeID)) <> N'' AND r.EmployeeID = @EmployeeID)
            OR (
                (@EmployeeID IS NULL OR LTRIM(RTRIM(@EmployeeID)) = N'')
                AND EXISTS (
                    SELECT 1 FROM NAMER.dbo.EP_Employees e
                    WHERE e.EmployeeID = r.EmployeeID
                      AND e.ManagerID1 = @ActingEmployeeID
                      AND e.EndWorkDate IS NULL
                      AND e.EmployeeID NOT LIKE '00000%'
                )
            )
        )
        ORDER BY s.SessionDate DESC;

        SET @TotalCount = @@ROWCOUNT;
        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load registrations.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetCourses
    @ActingEmployeeID NVARCHAR(50),
    @SearchText NVARCHAR(200) = NULL,
    @Status INT = NULL,
    @IsMandatory BIT = NULL,
    @CourseType NVARCHAR(100) = NULL,
    @SortBy NVARCHAR(50) = NULL,
    @SortDescending BIT = 0,
    @Skip INT = 0,
    @Take INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @Take IS NULL OR @Take < 1 SET @Take = 50;
        IF @Take > 500 SET @Take = 500;
        IF @Skip IS NULL OR @Skip < 0 SET @Skip = 0;

        SELECT @TotalCount = COUNT(*)
        FROM dbo.TrainingCourses c
        WHERE (@Status IS NULL OR c.Status = @Status)
          AND (@IsMandatory IS NULL OR c.IsMandatory = @IsMandatory)
          AND (@CourseType IS NULL OR c.CourseType = @CourseType)
          AND (@SearchText IS NULL OR c.Code LIKE N'%'+@SearchText+N'%' OR c.Name LIKE N'%'+@SearchText+N'%');

        SELECT c.Id, c.Code, c.Name, c.CourseType, c.DurationMinutes, c.ValidityMonths,
               c.IsMandatory, c.Status, c.Description,
               CAST(NULL AS INT) AS UpcomingSessionsCount,
               CAST(NULL AS NVARCHAR(30)) AS NearestSessionDate,
               CAST(NULL AS NVARCHAR(200)) AS NearestSessionLocation,
               CAST(NULL AS BIT) AS HasAvailablePlaces
        FROM dbo.TrainingCourses c
        WHERE (@Status IS NULL OR c.Status = @Status)
          AND (@IsMandatory IS NULL OR c.IsMandatory = @IsMandatory)
          AND (@CourseType IS NULL OR c.CourseType = @CourseType)
          AND (@SearchText IS NULL OR c.Code LIKE N'%'+@SearchText+N'%' OR c.Name LIKE N'%'+@SearchText+N'%')
        ORDER BY c.Name
        OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to list courses.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetCourseDetails
    @CourseId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @CourseId)
        BEGIN SET @ErrorCode = N'TRAINING_COURSE_NOT_FOUND'; SET @Message = N'Course not found.'; GOTO DoneMeta; END

        SELECT c.Id, c.Code, c.Name, c.CourseType, c.DurationMinutes, c.ValidityMonths,
               c.IsMandatory, c.Status, c.Description,
               CAST(NULL AS INT) AS UpcomingSessionsCount,
               CAST(NULL AS NVARCHAR(30)) AS NearestSessionDate,
               CAST(NULL AS NVARCHAR(200)) AS NearestSessionLocation,
               CAST(NULL AS BIT) AS HasAvailablePlaces,
               CONVERT(NVARCHAR(30), c.InsertedAt, 126) AS InsertedAt,
               CONVERT(NVARCHAR(30), c.UpdatedAt, 126) AS UpdatedAt,
               c.CreatedByEmployeeID, c.UpdatedByEmployeeID
        FROM dbo.TrainingCourses c WHERE c.Id = @CourseId;

        SET @EntityId = @CourseId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load course.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_SaveCourse
    @Id INT = NULL,
    @Code NVARCHAR(50),
    @Name NVARCHAR(200),
    @Description NVARCHAR(4000) = NULL,
    @CourseType NVARCHAR(100) = NULL,
    @DurationMinutes INT = NULL,
    @ValidityMonths INT = NULL,
    @IsMandatory BIT = 0,
    @Status INT = 1,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @Code IS NULL OR @Name IS NULL OR LTRIM(RTRIM(@Code)) = N'' OR LTRIM(RTRIM(@Name)) = N''
        BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'Code and Name required.'; GOTO DoneMeta; END

        IF @Id IS NULL OR @Id = 0
        BEGIN
            IF EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Code = @Code)
            BEGIN SET @ErrorCode = N'TRAINING_COURSE_CODE_EXISTS'; SET @Message = N'Code exists.'; GOTO DoneMeta; END

            INSERT INTO dbo.TrainingCourses (Code, Name, Description, CourseType, DurationMinutes, ValidityMonths, IsMandatory, Status, CreatedByEmployeeID)
            VALUES (@Code, @Name, @Description, @CourseType, @DurationMinutes, @ValidityMonths, @IsMandatory, @Status, @ActingEmployeeID);
            SET @EntityId = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @Id)
            BEGIN SET @ErrorCode = N'TRAINING_COURSE_NOT_FOUND'; SET @Message = N'Course not found.'; GOTO DoneMeta; END
            IF EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Code = @Code AND Id <> @Id)
            BEGIN SET @ErrorCode = N'TRAINING_COURSE_CODE_EXISTS'; SET @Message = N'Code exists.'; GOTO DoneMeta; END

            UPDATE dbo.TrainingCourses
            SET Code=@Code, Name=@Name, Description=@Description, CourseType=@CourseType,
                DurationMinutes=@DurationMinutes, ValidityMonths=@ValidityMonths, IsMandatory=@IsMandatory,
                Status=@Status, UpdatedAt=GETDATE(), UpdatedByEmployeeID=@ActingEmployeeID
            WHERE Id = @Id;
            SET @EntityId = @Id;
        END

        EXEC dbo.usp_Training_GetCourseDetails @CourseId = @EntityId, @ActingEmployeeID = @ActingEmployeeID;
        RETURN;
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Save course failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_ActivateCourse
    @CourseId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @CourseId)
        BEGIN SET @ErrorCode = N'TRAINING_COURSE_NOT_FOUND'; SET @Message = N'Course not found.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCourses
        SET Status = 1, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @CourseId;

        EXEC dbo.usp_Training_GetCourseDetails @CourseId = @CourseId, @ActingEmployeeID = @ActingEmployeeID;
        RETURN;
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Update course status failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_DeactivateCourse
    @CourseId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @CourseId)
        BEGIN SET @ErrorCode = N'TRAINING_COURSE_NOT_FOUND'; SET @Message = N'Course not found.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCourses
        SET Status = 0, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @CourseId;

        EXEC dbo.usp_Training_GetCourseDetails @CourseId = @CourseId, @ActingEmployeeID = @ActingEmployeeID;
        RETURN;
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Update course status failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetSessions
    @ActingEmployeeID NVARCHAR(50),
    @CourseId INT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @Status INT = NULL,
    @LecturerEmployeeID NVARCHAR(50) = NULL,
    @SearchText NVARCHAR(200) = NULL,
    @SortBy NVARCHAR(50) = NULL,
    @SortDescending BIT = 0,
    @Skip INT = 0,
    @Take INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @Take IS NULL OR @Take < 1 SET @Take = 50;
        IF @Take > 500 SET @Take = 500;
        IF @Skip IS NULL OR @Skip < 0 SET @Skip = 0;

        SELECT @TotalCount = COUNT(*)
        FROM dbo.TrainingCourseSessions s
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE (@CourseId IS NULL OR s.CourseId = @CourseId)
          AND (@FromDate IS NULL OR s.SessionDate >= @FromDate)
          AND (@ToDate IS NULL OR s.SessionDate <= @ToDate)
          AND (@Status IS NULL OR s.Status = @Status)
          AND (@LecturerEmployeeID IS NULL OR s.LecturerEmployeeID = @LecturerEmployeeID)
          AND (@SearchText IS NULL OR c.Name LIKE N'%'+@SearchText+N'%' OR s.Location LIKE N'%'+@SearchText+N'%');

        SELECT
            s.Id, s.CourseId, c.Code AS CourseCode, c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(8), s.StartTime, 108) AS StartTime,
            CONVERT(NVARCHAR(8), s.EndTime, 108) AS EndTime,
            s.Location, s.LecturerEmployeeID, dbo.fn_Training_EmpName(s.LecturerEmployeeID) AS LecturerName,
            s.Capacity,
            (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4)) AS RegisteredCount,
            s.Capacity - (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4)) AS AvailablePlaces,
            CONVERT(NVARCHAR(30), s.RegistrationCloseAt, 126) AS RegistrationCloseAt,
            s.Status,
            CAST(NULL AS BIT) AS IsRegisteredByCurrentEmployee,
            CAST(NULL AS BIT) AS CanRegister,
            CAST(NULL AS INT) AS CanCancelRegistrationId
        FROM dbo.TrainingCourseSessions s
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE (@CourseId IS NULL OR s.CourseId = @CourseId)
          AND (@FromDate IS NULL OR s.SessionDate >= @FromDate)
          AND (@ToDate IS NULL OR s.SessionDate <= @ToDate)
          AND (@Status IS NULL OR s.Status = @Status)
          AND (@LecturerEmployeeID IS NULL OR s.LecturerEmployeeID = @LecturerEmployeeID)
          AND (@SearchText IS NULL OR c.Name LIKE N'%'+@SearchText+N'%' OR s.Location LIKE N'%'+@SearchText+N'%')
        ORDER BY s.SessionDate DESC, s.Id DESC
        OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to list sessions.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetSessionDetails
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourseSessions WHERE Id = @SessionId)
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END

        SELECT
            s.Id, s.CourseId, c.Code AS CourseCode, c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(8), s.StartTime, 108) AS StartTime,
            CONVERT(NVARCHAR(8), s.EndTime, 108) AS EndTime,
            s.Location, s.LecturerEmployeeID, dbo.fn_Training_EmpName(s.LecturerEmployeeID) AS LecturerName,
            s.Capacity,
            (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4)) AS RegisteredCount,
            s.Capacity - (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4)) AS AvailablePlaces,
            CONVERT(NVARCHAR(30), s.RegistrationCloseAt, 126) AS RegistrationCloseAt,
            s.Status,
            CAST(NULL AS BIT) AS IsRegisteredByCurrentEmployee,
            CAST(NULL AS BIT) AS CanRegister,
            CAST(NULL AS INT) AS CanCancelRegistrationId,
            s.AttendanceWindowOpen,
            CONVERT(NVARCHAR(30), s.AttendanceWindowOpenedAt, 126) AS AttendanceWindowOpenedAt,
            CONVERT(NVARCHAR(30), s.AttendanceWindowClosedAt, 126) AS AttendanceWindowClosedAt,
            CONVERT(NVARCHAR(30), s.AttendanceOpenAt, 126) AS AttendanceOpenAt,
            CONVERT(NVARCHAR(30), s.AttendanceCloseAt, 126) AS AttendanceCloseAt,
            CONVERT(NVARCHAR(30), s.QrTokenExpiresAt, 126) AS QrTokenExpiresAt,
            s.CancelReason,
            s.LecturerEmployeeID AS Lecturer_EmployeeID,
            dbo.fn_Training_EmpName(s.LecturerEmployeeID) AS Lecturer_FullName,
            CONVERT(NVARCHAR(30), s.InsertedAt, 126) AS InsertedAt,
            CONVERT(NVARCHAR(30), s.UpdatedAt, 126) AS UpdatedAt,
            s.CreatedByEmployeeID, s.UpdatedByEmployeeID
        FROM dbo.TrainingCourseSessions s
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE s.Id = @SessionId;

        SET @EntityId = @SessionId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load session.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_SaveSession
    @Id INT = NULL,
    @CourseId INT,
    @SessionDate DATE,
    @StartTime TIME(0),
    @EndTime TIME(0),
    @Location NVARCHAR(200) = NULL,
    @LecturerEmployeeID NVARCHAR(50),
    @Capacity INT,
    @RegistrationCloseAt DATETIME2(3),
    @AttendanceOpenAt DATETIME2(3) = NULL,
    @AttendanceCloseAt DATETIME2(3) = NULL,
    @Status INT = NULL,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @CourseId)
        BEGIN SET @ErrorCode = N'TRAINING_COURSE_NOT_FOUND'; SET @Message = N'Course not found.'; GOTO DoneMeta; END
        IF dbo.fn_Training_EmpExists(@LecturerEmployeeID) = 0
        BEGIN SET @ErrorCode = N'TRAINING_LECTURER_NOT_FOUND'; SET @Message = N'Lecturer not found.'; GOTO DoneMeta; END
        IF @Capacity IS NULL OR @Capacity < 1
        BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'Capacity required.'; GOTO DoneMeta; END
        IF @EndTime <= @StartTime
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_INVALID_TIME_RANGE'; SET @Message = N'EndTime must be after StartTime.'; GOTO DoneMeta; END
        IF @AttendanceOpenAt IS NOT NULL AND @AttendanceCloseAt IS NOT NULL AND @AttendanceCloseAt <= @AttendanceOpenAt
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_INVALID_ATTENDANCE_WINDOW'; SET @Message = N'AttendanceCloseAt must be after AttendanceOpenAt.'; GOTO DoneMeta; END

        IF @Id IS NULL OR @Id = 0
        BEGIN
            INSERT INTO dbo.TrainingCourseSessions
            (CourseId, SessionDate, StartTime, EndTime, Location, LecturerEmployeeID, Capacity,
             RegistrationCloseAt, AttendanceOpenAt, AttendanceCloseAt, Status, CreatedByEmployeeID)
            VALUES
            (@CourseId, @SessionDate, @StartTime, @EndTime, @Location, @LecturerEmployeeID, @Capacity,
             @RegistrationCloseAt, @AttendanceOpenAt, @AttendanceCloseAt, ISNULL(@Status, 1), @ActingEmployeeID);
            SET @EntityId = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourseSessions WHERE Id = @Id)
            BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END

            UPDATE dbo.TrainingCourseSessions
            SET CourseId=@CourseId, SessionDate=@SessionDate, StartTime=@StartTime, EndTime=@EndTime,
                Location=@Location, LecturerEmployeeID=@LecturerEmployeeID, Capacity=@Capacity,
                RegistrationCloseAt=@RegistrationCloseAt,
                AttendanceOpenAt=@AttendanceOpenAt,
                AttendanceCloseAt=@AttendanceCloseAt,
                Status = ISNULL(@Status, Status),
                UpdatedAt=GETDATE(), UpdatedByEmployeeID=@ActingEmployeeID
            WHERE Id = @Id;
            SET @EntityId = @Id;
        END

        EXEC dbo.usp_Training_GetSessionDetails @SessionId = @EntityId, @ActingEmployeeID = @ActingEmployeeID;
        RETURN;
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Save session failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_CancelSession
    @SessionId INT,
    @Reason NVARCHAR(500) = NULL,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourseSessions WHERE Id = @SessionId)
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCourseSessions
        SET Status = 0, CancelReason = @Reason, CancelledAt = GETDATE(),
            CancelledByEmployeeID = @ActingEmployeeID, AttendanceWindowOpen = 0,
            QrTokenHash = NULL, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @SessionId;

        SET @EntityId = @SessionId;
        SELECT @SessionId AS SessionId, 0 AS Status;
        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Cancel session failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetSessionRegistrations
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        SELECT
            r.Id, r.SessionId, c.Id AS CourseId, c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(8), s.StartTime, 108) AS StartTime,
            CONVERT(NVARCHAR(8), s.EndTime, 108) AS EndTime,
            s.Location, r.EmployeeID, dbo.fn_Training_EmpName(r.EmployeeID) AS EmployeeFullName,
            CONVERT(NVARCHAR(30), r.RegisteredAt, 126) AS RegisteredAt,
            r.Status,
            CONVERT(NVARCHAR(30), r.CancelledAt, 126) AS CancelledAt,
            r.CancellationReason,
            CAST(NULL AS INT) AS AttendanceStatus,
            CAST(NULL AS INT) AS CertificateStatus
        FROM dbo.TrainingRegistrations r
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = r.SessionId
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE r.SessionId = @SessionId
        ORDER BY r.RegisteredAt;

        SET @TotalCount = @@ROWCOUNT; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load participants.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetLecturerSessions
    @ActingEmployeeID NVARCHAR(50),
    @FromDate DATE = NULL,
    @ToDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        EXEC dbo.usp_Training_GetSessions
            @ActingEmployeeID = @ActingEmployeeID,
            @FromDate = @FromDate,
            @ToDate = @ToDate,
            @LecturerEmployeeID = @ActingEmployeeID,
            @Skip = 0,
            @Take = 500;
        RETURN;
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load lecturer sessions.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_CompleteTrainingSession
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        DECLARE @St INT, @Open BIT;
        SELECT @St = Status, @Open = AttendanceWindowOpen FROM dbo.TrainingCourseSessions WHERE Id = @SessionId;
        IF @St IS NULL BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END
        IF @St = 0 BEGIN SET @ErrorCode = N'TRAINING_SESSION_CANCELLED'; SET @Message = N'Session cancelled.'; GOTO DoneMeta; END
        IF @St = 3 BEGIN SET @ErrorCode = N'TRAINING_SESSION_ALREADY_COMPLETED'; SET @Message = N'Already completed.'; GOTO DoneMeta; END
        IF @Open = 1 BEGIN SET @ErrorCode = N'TRAINING_ATTENDANCE_WINDOW_STILL_OPEN'; SET @Message = N'Close attendance window first.'; GOTO DoneMeta; END

        BEGIN TRAN;
        UPDATE dbo.TrainingRegistrations SET Status = 3, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE SessionId = @SessionId AND Status = 1;

        UPDATE dbo.TrainingCourseSessions
        SET Status = 3, CompletedAt = GETDATE(), CompletedByEmployeeID = @ActingEmployeeID,
            UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @SessionId;
        COMMIT TRAN;

        EXEC dbo.usp_Training_GetSessionDetails @SessionId = @SessionId, @ActingEmployeeID = @ActingEmployeeID;
        RETURN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Complete session failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_OpenAttendanceWindow
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50),
    @TokenHash NVARCHAR(128),
    @ExpiresAt DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @TokenHash IS NULL OR LTRIM(RTRIM(@TokenHash)) = N''
        BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'TokenHash required from application.'; GOTO DoneMeta; END

        -- Always compute expiry on the SQL local clock (GETDATE()).
        SET @ExpiresAt = DATEADD(MINUTE, 30, GETDATE());

        DECLARE @St INT, @Open BIT;
        SELECT @St = Status, @Open = AttendanceWindowOpen FROM dbo.TrainingCourseSessions WHERE Id = @SessionId;
        IF @St IS NULL BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END
        IF @St IN (0, 3) BEGIN SET @ErrorCode = N'TRAINING_ATTENDANCE_OPEN_NOT_ALLOWED'; SET @Message = N'Cannot open window.'; GOTO DoneMeta; END
        IF @Open = 1 BEGIN SET @ErrorCode = N'TRAINING_ATTENDANCE_ALREADY_OPEN'; SET @Message = N'Already open.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCourseSessions
        SET AttendanceWindowOpen = 1,
            AttendanceWindowOpenedAt = GETDATE(),
            AttendanceOpenedByEmployeeID = @ActingEmployeeID,
            QrTokenHash = @TokenHash,
            QrTokenExpiresAt = @ExpiresAt,
            UpdatedAt = GETDATE(),
            UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @SessionId;

        SELECT @SessionId AS SessionId, CAST(1 AS BIT) AS AttendanceWindowOpen,
               CONVERT(NVARCHAR(30), GETDATE(), 126) AS OpenedAt,
               CAST(NULL AS NVARCHAR(30)) AS ClosedAt,
               CAST(NULL AS NVARCHAR(200)) AS QrToken,
               CONVERT(NVARCHAR(30), @ExpiresAt, 126) AS QrTokenExpiresAt;

        SET @EntityId = @SessionId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Open window failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_CloseAttendanceWindow
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCourseSessions WHERE Id = @SessionId)
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCourseSessions
        SET AttendanceWindowOpen = 0,
            AttendanceWindowClosedAt = GETDATE(),
            AttendanceClosedByEmployeeID = @ActingEmployeeID,
            QrTokenHash = NULL,
            UpdatedAt = GETDATE(),
            UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @SessionId;

        SELECT @SessionId AS SessionId, CAST(0 AS BIT) AS AttendanceWindowOpen,
               CAST(NULL AS NVARCHAR(30)) AS OpenedAt,
               CONVERT(NVARCHAR(30), GETDATE(), 126) AS ClosedAt,
               CAST(NULL AS NVARCHAR(200)) AS QrToken,
               CAST(NULL AS NVARCHAR(30)) AS QrTokenExpiresAt;

        SET @EntityId = @SessionId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Close window failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GenerateSessionQrToken
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50),
    @TokenHash NVARCHAR(128),
    @ExpiresAt DATETIME2(3)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @TokenHash IS NULL OR LTRIM(RTRIM(@TokenHash)) = N''
        BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'TokenHash required.'; GOTO DoneMeta; END

        -- Always compute expiry on the SQL local clock (GETDATE()).
        SET @ExpiresAt = DATEADD(MINUTE, 30, GETDATE());

        DECLARE @Open BIT;
        SELECT @Open = AttendanceWindowOpen FROM dbo.TrainingCourseSessions WHERE Id = @SessionId;
        IF @Open IS NULL BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END
        IF @Open <> 1 BEGIN SET @ErrorCode = N'TRAINING_ATTENDANCE_NOT_OPEN'; SET @Message = N'Window not open.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCourseSessions
        SET QrTokenHash = @TokenHash, QrTokenExpiresAt = @ExpiresAt,
            UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @SessionId;

        SELECT @SessionId AS SessionId, CAST(NULL AS NVARCHAR(200)) AS QrToken,
               CONVERT(NVARCHAR(30), @ExpiresAt, 126) AS ExpiresAt;
        SET @EntityId = @SessionId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Generate QR failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetActiveSessionQrToken
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        SELECT
            s.Id AS SessionId,
            CAST(NULL AS NVARCHAR(200)) AS QrToken,
            CONVERT(NVARCHAR(30), s.QrTokenExpiresAt, 126) AS ExpiresAt,
            s.AttendanceWindowOpen
        FROM dbo.TrainingCourseSessions s
        WHERE s.Id = @SessionId;

        IF @@ROWCOUNT = 0
        BEGIN SET @ErrorCode = N'TRAINING_SESSION_NOT_FOUND'; SET @Message = N'Session not found.'; GOTO DoneMeta; END

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load QR metadata.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetAttendanceSessionByToken
    @TokenHash NVARCHAR(128),
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @TokenHash IS NULL OR LTRIM(RTRIM(@TokenHash)) = N''
        BEGIN SET @ErrorCode = N'TRAINING_QR_INVALID'; SET @Message = N'Invalid token.'; GOTO DoneMeta; END

        DECLARE @SessionId INT, @Open BIT, @Exp DATETIME2(3);
        SELECT @SessionId = Id, @Open = AttendanceWindowOpen, @Exp = QrTokenExpiresAt
        FROM dbo.TrainingCourseSessions
        WHERE QrTokenHash = @TokenHash;

        IF @SessionId IS NULL BEGIN SET @ErrorCode = N'TRAINING_QR_INVALID'; SET @Message = N'Invalid token.'; GOTO DoneMeta; END
        IF @Open <> 1 BEGIN SET @ErrorCode = N'TRAINING_ATTENDANCE_WINDOW_NOT_OPEN'; SET @Message = N'Window not open.'; GOTO DoneMeta; END
        IF @Exp IS NULL OR @Exp <= GETDATE() BEGIN SET @ErrorCode = N'TRAINING_QR_EXPIRED'; SET @Message = N'Token expired.'; GOTO DoneMeta; END

        SELECT
            s.Id AS SessionId, c.Id AS CourseId, c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(8), s.StartTime, 108) AS StartTime,
            CONVERT(NVARCHAR(8), s.EndTime, 108) AS EndTime,
            s.Location, s.AttendanceWindowOpen,
            CONVERT(NVARCHAR(30), s.QrTokenExpiresAt, 126) AS QrTokenExpiresAt,
            CAST(1 AS BIT) AS RequiresIdentityConfirmation,
            dbo.fn_Training_EmpName(s.LecturerEmployeeID) AS LecturerName,
            CAST(1 AS BIT) AS CanConfirmAttendance,
            (SELECT TOP 1 a.Status FROM dbo.TrainingAttendance a WHERE a.SessionId = s.Id AND a.EmployeeID = @ActingEmployeeID ORDER BY a.Id DESC) AS ExistingAttendanceStatus,
            (SELECT TOP 1 CONVERT(NVARCHAR(30), a.ConfirmedAt, 126) FROM dbo.TrainingAttendance a WHERE a.SessionId = s.Id AND a.EmployeeID = @ActingEmployeeID ORDER BY a.Id DESC) AS ExistingConfirmedAt,
            CAST(NULL AS NVARCHAR(500)) AS SafeMessage
        FROM dbo.TrainingCourseSessions s
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE s.Id = @SessionId;

        SET @EntityId = @SessionId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Resolve token failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_ConfirmCourseAttendance
    @TokenHash NVARCHAR(128),
    @IdentityNumber NVARCHAR(50),
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    DECLARE @SessionId INT, @Open BIT, @Exp DATETIME2(3), @RegId INT, @AttId INT, @CourseName NVARCHAR(200), @SessionDate DATE, @GenCert BIT;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF LTRIM(RTRIM(ISNULL(@IdentityNumber, N''))) <> LTRIM(RTRIM(@ActingEmployeeID))
        BEGIN SET @ErrorCode = N'TRAINING_IDENTITY_MISMATCH'; SET @Message = N'Identity does not match employee.'; GOTO DoneMeta; END

        SELECT @SessionId = Id, @Open = AttendanceWindowOpen, @Exp = QrTokenExpiresAt
        FROM dbo.TrainingCourseSessions WHERE QrTokenHash = @TokenHash;

        IF @SessionId IS NULL BEGIN SET @ErrorCode = N'TRAINING_QR_INVALID'; SET @Message = N'Invalid token.'; GOTO DoneMeta; END
        IF @Open <> 1 BEGIN SET @ErrorCode = N'TRAINING_ATTENDANCE_WINDOW_NOT_OPEN'; SET @Message = N'Window not open.'; GOTO DoneMeta; END
        IF @Exp IS NULL OR @Exp <= GETDATE() BEGIN SET @ErrorCode = N'TRAINING_QR_EXPIRED'; SET @Message = N'Token expired.'; GOTO DoneMeta; END

        SELECT TOP 1 @AttId = Id FROM dbo.TrainingAttendance
        WHERE SessionId = @SessionId AND EmployeeID = @ActingEmployeeID AND Status IN (1, 3);

        SELECT @CourseName = c.Name, @SessionDate = s.SessionDate, @GenCert = c.GeneratesCertificate
        FROM dbo.TrainingCourseSessions s INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        WHERE s.Id = @SessionId;

        IF @AttId IS NOT NULL
        BEGIN
            SELECT @RegId = RegistrationId FROM dbo.TrainingAttendance WHERE Id = @AttId;
            SELECT @AttId AS AttendanceId, @RegId AS RegistrationId, @SessionId AS SessionId,
                   CONVERT(NVARCHAR(30), ConfirmedAt, 126) AS ConfirmedAt,
                   CAST(0 AS BIT) AS CertificateQueued, CAST(1 AS BIT) AS AlreadyConfirmed,
                   N'Already confirmed' AS SafeMessage, @CourseName AS CourseName,
                   CONVERT(NVARCHAR(30), @SessionDate, 23) AS SessionDate,
                   (SELECT TOP 1 Id FROM dbo.TrainingCertificates WHERE AttendanceId = @AttId ORDER BY Id DESC) AS CertificateId
            FROM dbo.TrainingAttendance WHERE Id = @AttId;
            SET @EntityId = @AttId; SET @Success = 1; SET @Message = N'OK';
            GOTO DoneMeta;
        END

        SELECT TOP 1 @RegId = Id FROM dbo.TrainingRegistrations
        WHERE SessionId = @SessionId AND EmployeeID = @ActingEmployeeID AND Status = 1;

        IF @RegId IS NULL BEGIN SET @ErrorCode = N'TRAINING_EMPLOYEE_NOT_REGISTERED'; SET @Message = N'Not registered.'; GOTO DoneMeta; END

        BEGIN TRAN;
        INSERT INTO dbo.TrainingAttendance
        (RegistrationId, SessionId, EmployeeID, Source, Status, ConfirmedByEmployeeID, IdentityEntered, CreatedByEmployeeID)
        VALUES (@RegId, @SessionId, @ActingEmployeeID, 1, 1, @ActingEmployeeID, @IdentityNumber, @ActingEmployeeID);
        SET @AttId = SCOPE_IDENTITY();

        UPDATE dbo.TrainingRegistrations SET Status = 2, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID WHERE Id = @RegId;

        IF @GenCert = 1 AND NOT EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE AttendanceId = @AttId)
        BEGIN
            DECLARE @CourseId INT, @ValidityMonths INT, @IssuedAt DATETIME2(3), @ExpiresAt DATETIME2(3);
            SELECT @CourseId = c.Id, @ValidityMonths = c.ValidityMonths
            FROM dbo.TrainingCourseSessions s
            INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
            WHERE s.Id = @SessionId;
            SET @IssuedAt = GETDATE();
            SET @ExpiresAt = CASE WHEN @ValidityMonths IS NOT NULL AND @ValidityMonths > 0
                                  THEN DATEADD(MONTH, @ValidityMonths, @IssuedAt)
                                  ELSE NULL END;
            -- Status 1 = Issued. FilePath is filled by C# (PDF write) after this INSERT.
            INSERT INTO dbo.TrainingCertificates
            (AttendanceId, RegistrationId, SessionId, CourseId, EmployeeID, CertificateNumber,
             IssuedAt, ExpiresAt, Status, CreatedByEmployeeID)
            VALUES (@AttId, @RegId, @SessionId, @CourseId, @ActingEmployeeID,
                    N'TRN-' + CONVERT(NVARCHAR(4), YEAR(GETDATE())) + N'-' + RIGHT(N'000000' + CONVERT(NVARCHAR(20), @AttId), 6),
                    @IssuedAt, @ExpiresAt, 1, @ActingEmployeeID);
        END
        COMMIT TRAN;

        SELECT @AttId AS AttendanceId, @RegId AS RegistrationId, @SessionId AS SessionId,
               CONVERT(NVARCHAR(30), GETDATE(), 126) AS ConfirmedAt,
               CAST(CASE WHEN @GenCert = 1 THEN 1 ELSE 0 END AS BIT) AS CertificateQueued,
               CAST(0 AS BIT) AS AlreadyConfirmed,
               CAST(NULL AS NVARCHAR(500)) AS SafeMessage,
               @CourseName AS CourseName,
               CONVERT(NVARCHAR(30), @SessionDate, 23) AS SessionDate,
               (SELECT TOP 1 Id FROM dbo.TrainingCertificates WHERE AttendanceId = @AttId ORDER BY Id DESC) AS CertificateId;

        SET @EntityId = @AttId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Confirm attendance failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetSessionAttendance
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        SELECT
            a.Id AS AttendanceId, r.Id AS RegistrationId, r.SessionId, r.EmployeeID,
            dbo.fn_Training_EmpName(r.EmployeeID) AS EmployeeFullName,
            d.DepartnentDescripton AS DepartmentName,
            CONVERT(NVARCHAR(30), r.RegisteredAt, 126) AS RegisteredAt,
            ISNULL(a.Status, 2) AS AttendanceStatus,
            CONVERT(NVARCHAR(30), a.ConfirmedAt, 126) AS ConfirmedAt,
            a.Source, ISNULL(a.IsManualUpdate, CAST(0 AS BIT)) AS IsManualUpdate,
            a.UpdatedByEmployeeID, a.ManualReason
        FROM dbo.TrainingRegistrations r
        LEFT JOIN dbo.TrainingAttendance a ON a.RegistrationId = r.Id AND a.Status IN (1, 2, 3)
        LEFT JOIN NAMER.dbo.EP_Employees e ON e.EmployeeID = r.EmployeeID
        LEFT JOIN NAMER.dbo.EP_Departnents d ON d.DepartnentCode = e.DepartnentCode
        WHERE r.SessionId = @SessionId AND r.Status IN (1, 2, 3, 4)
        ORDER BY r.RegisteredAt;

        SET @TotalCount = @@ROWCOUNT; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load attendance.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_UpdateAttendanceManually
    @SessionId INT,
    @EmployeeID NVARCHAR(50),
    @Attended BIT,
    @Reason NVARCHAR(500),
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    DECLARE @RegId INT, @AttId INT;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @Reason IS NULL OR LTRIM(RTRIM(@Reason)) = N''
        BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'Reason required.'; GOTO DoneMeta; END

        SELECT TOP 1 @RegId = Id FROM dbo.TrainingRegistrations
        WHERE SessionId = @SessionId AND EmployeeID = @EmployeeID AND Status IN (1, 2, 3, 4);

        IF @RegId IS NULL BEGIN SET @ErrorCode = N'TRAINING_EMPLOYEE_NOT_REGISTERED'; SET @Message = N'Not registered.'; GOTO DoneMeta; END

        BEGIN TRAN;
        IF @Attended = 1
        BEGIN
            IF EXISTS (SELECT 1 FROM dbo.TrainingAttendance WHERE RegistrationId = @RegId AND Status IN (1, 3))
                UPDATE dbo.TrainingAttendance
                SET Status = 3, IsManualUpdate = 1, ManualReason = @Reason, Source = 2,
                    ConfirmedAt = GETDATE(), ConfirmedByEmployeeID = @ActingEmployeeID,
                    UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
                WHERE RegistrationId = @RegId;
            ELSE
            BEGIN
                INSERT INTO dbo.TrainingAttendance
                (RegistrationId, SessionId, EmployeeID, Source, Status, ConfirmedByEmployeeID, IsManualUpdate, ManualReason, CreatedByEmployeeID)
                VALUES (@RegId, @SessionId, @EmployeeID, 2, 3, @ActingEmployeeID, 1, @Reason, @ActingEmployeeID);
            END
            SELECT @AttId = Id FROM dbo.TrainingAttendance WHERE RegistrationId = @RegId;
            UPDATE dbo.TrainingRegistrations SET Status = 2, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID WHERE Id = @RegId;

            IF EXISTS (SELECT 1 FROM dbo.TrainingCourses c
                       INNER JOIN dbo.TrainingCourseSessions s ON s.CourseId = c.Id
                       WHERE s.Id = @SessionId AND c.GeneratesCertificate = 1)
               AND NOT EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE AttendanceId = @AttId)
            BEGIN
                DECLARE @ManCourseId INT, @ManValidity INT, @ManIssued DATETIME2(3), @ManExpires DATETIME2(3);
                SELECT @ManCourseId = c.Id, @ManValidity = c.ValidityMonths
                FROM dbo.TrainingCourseSessions s
                INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
                WHERE s.Id = @SessionId;
                SET @ManIssued = GETDATE();
                SET @ManExpires = CASE WHEN @ManValidity IS NOT NULL AND @ManValidity > 0
                                       THEN DATEADD(MONTH, @ManValidity, @ManIssued) ELSE NULL END;
                INSERT INTO dbo.TrainingCertificates
                (AttendanceId, RegistrationId, SessionId, CourseId, EmployeeID, CertificateNumber,
                 IssuedAt, ExpiresAt, Status, CreatedByEmployeeID)
                VALUES (@AttId, @RegId, @SessionId, @ManCourseId, @EmployeeID,
                        N'TRN-' + CONVERT(NVARCHAR(4), YEAR(GETDATE())) + N'-' + RIGHT(N'000000' + CONVERT(NVARCHAR(20), @AttId), 6),
                        @ManIssued, @ManExpires, 1, @ActingEmployeeID);
            END

            SELECT @AttId AS AttendanceId, 3 AS Status;
        END
        ELSE
        BEGIN
            UPDATE dbo.TrainingAttendance
            SET Status = 0, IsManualUpdate = 1, ManualReason = @Reason,
                UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
            WHERE RegistrationId = @RegId;
            UPDATE dbo.TrainingRegistrations SET Status = 3, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID WHERE Id = @RegId;
            SELECT ISNULL((SELECT TOP 1 Id FROM dbo.TrainingAttendance WHERE RegistrationId = @RegId), 0) AS AttendanceId, 0 AS Status;
        END
        COMMIT TRAN;
        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Manual attendance failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetEmployeeCertificates
    @ActingEmployeeID NVARCHAR(50),
    @EmployeeID NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @EmployeeID IS NULL OR LTRIM(RTRIM(@EmployeeID)) = N'' SET @EmployeeID = @ActingEmployeeID;

        SELECT
            cert.Id, cert.CertificateNumber, cert.EmployeeID, dbo.fn_Training_EmpName(cert.EmployeeID) AS EmployeeFullName,
            cert.CourseId, c.Name AS CourseName, cert.SessionId,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(30), cert.IssuedAt, 126) AS IssuedAt,
            CONVERT(NVARCHAR(30), cert.ExpiresAt, 126) AS ExpiresAt,
            cert.Status,
            CAST(CASE WHEN cert.FilePath IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS DownloadAvailable
        FROM dbo.TrainingCertificates cert
        INNER JOIN dbo.TrainingCourses c ON c.Id = cert.CourseId
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = cert.SessionId
        WHERE cert.EmployeeID = @EmployeeID AND cert.Status <> 0
        ORDER BY cert.Id DESC;

        SET @TotalCount = @@ROWCOUNT; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load certificates.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GenerateCertificate
    @AttendanceId INT = NULL,
    @RegistrationId INT = NULL,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    DECLARE @Att INT, @Reg INT, @SessionId INT, @CourseId INT, @Emp NVARCHAR(50), @CertId INT, @Num NVARCHAR(50);

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @AttendanceId IS NOT NULL AND @AttendanceId > 0
            SELECT @Att = Id, @Reg = RegistrationId, @SessionId = SessionId, @Emp = EmployeeID
            FROM dbo.TrainingAttendance WHERE Id = @AttendanceId AND Status IN (1, 3);
        ELSE IF @RegistrationId IS NOT NULL AND @RegistrationId > 0
            SELECT @Att = Id, @Reg = RegistrationId, @SessionId = SessionId, @Emp = EmployeeID
            FROM dbo.TrainingAttendance WHERE RegistrationId = @RegistrationId AND Status IN (1, 3);

        IF @Att IS NULL BEGIN SET @ErrorCode = N'TRAINING_CERTIFICATE_NOT_ELIGIBLE'; SET @Message = N'Attendance not confirmed.'; GOTO DoneMeta; END

        SELECT @CourseId = CourseId FROM dbo.TrainingCourseSessions WHERE Id = @SessionId;

        IF EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE AttendanceId = @Att AND Status <> 0)
        BEGIN
            SELECT TOP 1 @CertId = Id FROM dbo.TrainingCertificates WHERE AttendanceId = @Att AND Status <> 0 ORDER BY Id DESC;
            UPDATE dbo.TrainingCertificates
            SET Status = CASE WHEN Status = 3 THEN 1 ELSE Status END,
                IssuedAt = ISNULL(IssuedAt, GETDATE()),
                ExpiresAt = CASE
                    WHEN ExpiresAt IS NOT NULL THEN ExpiresAt
                    WHEN EXISTS (
                        SELECT 1 FROM dbo.TrainingCourses c
                        WHERE c.Id = @CourseId AND c.ValidityMonths IS NOT NULL AND c.ValidityMonths > 0
                    )
                    THEN DATEADD(MONTH, (SELECT ValidityMonths FROM dbo.TrainingCourses WHERE Id = @CourseId), ISNULL(IssuedAt, GETDATE()))
                    ELSE NULL
                END,
                UpdatedAt = GETDATE(),
                UpdatedByEmployeeID = @ActingEmployeeID
            WHERE Id = @CertId;
        END
        ELSE
        BEGIN
            SET @Num = N'TRN-' + CONVERT(NVARCHAR(4), YEAR(GETDATE())) + N'-' + RIGHT(N'000000' + CONVERT(NVARCHAR(20), @Att), 6);
            INSERT INTO dbo.TrainingCertificates
            (AttendanceId, RegistrationId, SessionId, CourseId, EmployeeID, CertificateNumber, Status, IssuedAt, ExpiresAt, CreatedByEmployeeID)
            VALUES (@Att, @Reg, @SessionId, @CourseId, @Emp, @Num, 1, GETDATE(),
                    CASE WHEN EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @CourseId AND ValidityMonths IS NOT NULL AND ValidityMonths > 0)
                         THEN DATEADD(MONTH, (SELECT ValidityMonths FROM dbo.TrainingCourses WHERE Id = @CourseId), GETDATE())
                         ELSE NULL END,
                    @ActingEmployeeID);
            SET @CertId = SCOPE_IDENTITY();
        END

        SELECT cert.Id, cert.CertificateNumber, cert.EmployeeID, dbo.fn_Training_EmpName(cert.EmployeeID) AS EmployeeFullName,
               cert.CourseId, c.Name AS CourseName, cert.SessionId,
               CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
               CONVERT(NVARCHAR(30), cert.IssuedAt, 126) AS IssuedAt,
               CONVERT(NVARCHAR(30), cert.ExpiresAt, 126) AS ExpiresAt,
               cert.Status, CAST(CASE WHEN cert.FilePath IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS DownloadAvailable,
               cert.AttendanceId, cert.RegistrationId, cert.FilePath, cert.FileHash,
               cert.EmailStatus, CONVERT(NVARCHAR(30), cert.EmailSentAt, 126) AS LastAttemptAt,
               cert.LastSafeErrorMessage AS LastError, cert.EmailAttemptCount AS AttemptCount,
               cert.LastSafeErrorMessage AS ErrorInformation
        FROM dbo.TrainingCertificates cert
        INNER JOIN dbo.TrainingCourses c ON c.Id = cert.CourseId
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = cert.SessionId
        WHERE cert.Id = @CertId;

        SET @EntityId = @CertId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CERTIFICATE_GENERATION_FAILED'; SET @Message = N'Generate certificate failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_ProcessSessionCertificates
    @SessionId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    DECLARE @Total INT = 0, @Ok INT = 0, @Skip INT = 0, @Already INT = 0;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        DECLARE @AttId INT, @RegId INT, @Emp NVARCHAR(50), @CourseId INT;
        SELECT @CourseId = CourseId FROM dbo.TrainingCourseSessions WHERE Id = @SessionId;

        DECLARE c CURSOR LOCAL FAST_FORWARD FOR
            SELECT a.Id, a.RegistrationId, a.EmployeeID
            FROM dbo.TrainingAttendance a
            WHERE a.SessionId = @SessionId AND a.Status IN (1, 3);

        OPEN c;
        FETCH NEXT FROM c INTO @AttId, @RegId, @Emp;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @Total += 1;
            IF EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE AttendanceId = @AttId AND Status IN (1, 4))
                SET @Already += 1;
            ELSE IF EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE AttendanceId = @AttId AND Status = 3)
            BEGIN
                UPDATE dbo.TrainingCertificates
                SET Status = 1,
                    IssuedAt = ISNULL(IssuedAt, GETDATE()),
                    ExpiresAt = CASE
                        WHEN ExpiresAt IS NOT NULL THEN ExpiresAt
                        WHEN EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @CourseId AND ValidityMonths IS NOT NULL AND ValidityMonths > 0)
                        THEN DATEADD(MONTH, (SELECT ValidityMonths FROM dbo.TrainingCourses WHERE Id = @CourseId), ISNULL(IssuedAt, GETDATE()))
                        ELSE NULL END,
                    UpdatedAt = GETDATE(),
                    UpdatedByEmployeeID = @ActingEmployeeID
                WHERE AttendanceId = @AttId AND Status = 3;
                SET @Ok += 1;
            END
            ELSE
            BEGIN
                INSERT INTO dbo.TrainingCertificates
                (AttendanceId, RegistrationId, SessionId, CourseId, EmployeeID, CertificateNumber,
                 IssuedAt, ExpiresAt, Status, CreatedByEmployeeID)
                VALUES (@AttId, @RegId, @SessionId, @CourseId, @Emp,
                        N'TRN-' + CONVERT(NVARCHAR(4), YEAR(GETDATE())) + N'-' + RIGHT(N'000000' + CONVERT(NVARCHAR(20), @AttId), 6),
                        GETDATE(),
                        CASE WHEN EXISTS (SELECT 1 FROM dbo.TrainingCourses WHERE Id = @CourseId AND ValidityMonths IS NOT NULL AND ValidityMonths > 0)
                             THEN DATEADD(MONTH, (SELECT ValidityMonths FROM dbo.TrainingCourses WHERE Id = @CourseId), GETDATE())
                             ELSE NULL END,
                        1, @ActingEmployeeID);
                SET @Ok += 1;
            END
            FETCH NEXT FROM c INTO @AttId, @RegId, @Emp;
        END
        CLOSE c; DEALLOCATE c;

        SELECT @SessionId AS SessionId, @Total AS TotalCandidates, @Ok AS Successful, 0 AS Failed,
               @Skip AS Skipped, @Already AS AlreadyProcessed, @CorrelationId AS CorrelationId;
        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Process certificates failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_DownloadEmployeeCertificate
    @CertificateId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE Id = @CertificateId AND Status <> 0)
        BEGIN SET @ErrorCode = N'TRAINING_CERTIFICATE_NOT_FOUND'; SET @Message = N'Not found.'; GOTO DoneMeta; END

        SELECT
            cert.Id AS CertificateId,
            ISNULL(cert.FileName, cert.CertificateNumber + N'.pdf') AS FileName,
            ISNULL(cert.ContentType, N'application/pdf') AS ContentType,
            cert.FilePath,
            cert.FileHash,
            cert.EmployeeID,
            CAST(NULL AS NVARCHAR(MAX)) AS ContentBase64
        FROM dbo.TrainingCertificates cert
        WHERE cert.Id = @CertificateId;

        SET @EntityId = @CertificateId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CERTIFICATE_DOWNLOAD_FAILED'; SET @Message = N'Download metadata failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetCertificateForPdf
    @CertificateId INT = NULL,
    @AttendanceId INT = NULL,
    @SessionId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY
        IF (@CertificateId IS NULL OR @CertificateId <= 0)
           AND (@AttendanceId IS NULL OR @AttendanceId <= 0)
           AND (@SessionId IS NULL OR @SessionId <= 0)
        BEGIN
            SET @ErrorCode = N'TRAINING_VALIDATION_FAILED';
            SET @Message = N'Certificate, attendance, or session id is required.';
            GOTO DoneMeta;
        END

        SELECT
            cert.Id,
            cert.AttendanceId,
            cert.CertificateNumber,
            cert.EmployeeID,
            dbo.fn_Training_EmpName(cert.EmployeeID) AS EmployeeFullName,
            c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CONVERT(NVARCHAR(30), cert.IssuedAt, 126) AS IssuedAt,
            cert.FilePath,
            cert.FileName,
            cert.Status
        FROM dbo.TrainingCertificates cert
        INNER JOIN dbo.TrainingCourses c ON c.Id = cert.CourseId
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = cert.SessionId
        WHERE cert.Status <> 0
          AND (
                (@CertificateId IS NOT NULL AND @CertificateId > 0 AND cert.Id = @CertificateId)
             OR (@AttendanceId IS NOT NULL AND @AttendanceId > 0 AND cert.AttendanceId = @AttendanceId)
             OR (@SessionId IS NOT NULL AND @SessionId > 0 AND cert.SessionId = @SessionId
                 AND (cert.FilePath IS NULL OR LTRIM(RTRIM(cert.FilePath)) = N''))
          );

        SET @TotalCount = @@ROWCOUNT; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load certificate for PDF.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_SetCertificateFile
    @CertificateId INT,
    @FilePath NVARCHAR(500),
    @FileHash NVARCHAR(128),
    @FileName NVARCHAR(260),
    @ContentType NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY
        IF @CertificateId IS NULL OR @CertificateId <= 0
           OR @FilePath IS NULL OR LTRIM(RTRIM(@FilePath)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_VALIDATION_FAILED';
            SET @Message = N'Certificate id and file path are required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE Id = @CertificateId AND Status <> 0)
        BEGIN
            SET @ErrorCode = N'TRAINING_CERTIFICATE_NOT_FOUND';
            SET @Message = N'Not found.';
            GOTO DoneMeta;
        END

        UPDATE dbo.TrainingCertificates
        SET FilePath = @FilePath,
            FileHash = @FileHash,
            FileName = @FileName,
            ContentType = ISNULL(@ContentType, N'application/pdf'),
            UpdatedAt = GETDATE()
        WHERE Id = @CertificateId;

        SET @EntityId = @CertificateId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to store certificate file path.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_ResendCertificateEmail
    @CertificateId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF NOT EXISTS (SELECT 1 FROM dbo.TrainingCertificates WHERE Id = @CertificateId)
        BEGIN SET @ErrorCode = N'TRAINING_CERTIFICATE_NOT_FOUND'; SET @Message = N'Not found.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCertificates
        SET EmailStatus = 0, EmailAttemptCount = EmailAttemptCount + 1,
            UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @CertificateId;

        DECLARE @Emp NVARCHAR(50), @SessionId INT;
        SELECT @Emp = EmployeeID, @SessionId = SessionId FROM dbo.TrainingCertificates WHERE Id = @CertificateId;

        INSERT INTO dbo.TrainingNotifications (NotificationType, Channel, SessionId, CertificateId, EmployeeID, Status, CreatedByEmployeeID)
        VALUES (2, 1, @SessionId, @CertificateId, @Emp, 0, @ActingEmployeeID);

        SELECT @CertificateId AS CertificateId, 0 AS EmailStatus,
               CONVERT(NVARCHAR(30), GETDATE(), 126) AS LastAttemptAt,
               CAST(NULL AS NVARCHAR(1000)) AS LastError,
               EmailAttemptCount AS AttemptCount
        FROM dbo.TrainingCertificates WHERE Id = @CertificateId;

        SET @EntityId = @CertificateId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_EMAIL_DELIVERY_FAILED'; SET @Message = N'Resend queue failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetCertificateErrors
    @ActingEmployeeID NVARCHAR(50),
    @Status INT = NULL,
    @CourseId INT = NULL,
    @SessionId INT = NULL,
    @EmployeeSearch NVARCHAR(200) = NULL,
    @RetryableOnly BIT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @Skip INT = 0,
    @Take INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @Take IS NULL OR @Take < 1 SET @Take = 50;
        IF @Take > 500 SET @Take = 500;
        IF @Skip IS NULL OR @Skip < 0 SET @Skip = 0;

        SELECT @TotalCount = COUNT(*)
        FROM dbo.TrainingCertificates cert
        WHERE cert.Status IN (5) OR cert.EmailStatus = 2;

        SELECT
            cert.Id AS CertificateId, cert.CourseId, c.Name AS CourseName, cert.SessionId,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            cert.EmployeeID, dbo.fn_Training_EmpName(cert.EmployeeID) AS EmployeeFullName,
            cert.CertificateNumber, cert.Status, cert.EmailStatus, cert.GenerationAttemptCount AS AttemptCount,
            CONVERT(NVARCHAR(30), cert.UpdatedAt, 126) AS LastAttemptAt,
            cert.LastSafeErrorMessage AS SafeErrorMessage,
            CAST(CASE WHEN cert.GenerationAttemptCount < 5 THEN 1 ELSE 0 END AS BIT) AS Retryable
        FROM dbo.TrainingCertificates cert
        INNER JOIN dbo.TrainingCourses c ON c.Id = cert.CourseId
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = cert.SessionId
        WHERE (cert.Status = 5 OR cert.EmailStatus = 2)
          AND (@CourseId IS NULL OR cert.CourseId = @CourseId)
          AND (@SessionId IS NULL OR cert.SessionId = @SessionId)
        ORDER BY cert.Id DESC
        OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load certificate errors.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_RetryCertificateGeneration
    @CertificateId INT,
    @ActingEmployeeID NVARCHAR(50),
    @Reason NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        DECLARE @Attempts INT;
        SELECT @Attempts = GenerationAttemptCount FROM dbo.TrainingCertificates WHERE Id = @CertificateId;
        IF @Attempts IS NULL BEGIN SET @ErrorCode = N'TRAINING_CERTIFICATE_NOT_FOUND'; SET @Message = N'Not found.'; GOTO DoneMeta; END
        IF @Attempts >= 5 BEGIN SET @ErrorCode = N'TRAINING_CERTIFICATE_GENERATION_FAILED'; SET @Message = N'Retry limit reached.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingCertificates
        SET Status = 3, GenerationAttemptCount = GenerationAttemptCount + 1,
            LastSafeErrorMessage = NULL, LastErrorCode = NULL,
            UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @CertificateId;

        SELECT @CertificateId AS CertificateId, 3 AS Status, GenerationAttemptCount AS AttemptCount,
               CAST(NULL AS NVARCHAR(1000)) AS SafeErrorMessage
        FROM dbo.TrainingCertificates WHERE Id = @CertificateId;

        SET @EntityId = @CertificateId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Retry failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_ProcessTrainingReminders
    @ActingEmployeeID NVARCHAR(50),
    @TargetDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    DECLARE @Total INT = 0, @Ok INT = 0, @Already INT = 0;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @TargetDate IS NULL SET @TargetDate = CAST(DATEADD(DAY, 1, GETDATE()) AS DATE);

        INSERT INTO dbo.TrainingNotifications (NotificationType, Channel, SessionId, RegistrationId, CourseId, EmployeeID, Status, ScheduledAt, CorrelationId, CreatedByEmployeeID)
        SELECT 1, 1, r.SessionId, r.Id, s.CourseId, r.EmployeeID, 0, GETDATE(), @CorrelationId, @ActingEmployeeID
        FROM dbo.TrainingRegistrations r
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = r.SessionId
        WHERE r.Status = 1
          AND s.Status IN (1, 2, 5)
          AND s.SessionDate = @TargetDate
          AND NOT EXISTS (
              SELECT 1 FROM dbo.TrainingNotifications n
              WHERE n.NotificationType = 1 AND n.RegistrationId = r.Id AND n.Status IN (0, 1)
          );

        SET @Ok = @@ROWCOUNT;

        SELECT @Already = COUNT(*)
        FROM dbo.TrainingNotifications n
        INNER JOIN dbo.TrainingRegistrations r ON r.Id = n.RegistrationId
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = r.SessionId
        WHERE n.NotificationType = 1 AND n.Status = 1 AND s.SessionDate = @TargetDate;

        SET @Total = @Ok + @Already;

        SELECT CONVERT(NVARCHAR(30), @TargetDate, 23) AS TargetDate, @Total AS TotalCandidates,
               @Ok AS Successful, 0 AS Failed, 0 AS Skipped, @Already AS AlreadyProcessed, @CorrelationId AS CorrelationId;

        SELECT n.Id AS NotificationId, n.EmployeeID, e.Email, n.SessionId, n.RegistrationId,
               c.Name AS CourseName, CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate, n.Channel
        FROM dbo.TrainingNotifications n
        INNER JOIN dbo.TrainingCourseSessions s ON s.Id = n.SessionId
        INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
        LEFT JOIN NAMER.dbo.EP_Employees e ON e.EmployeeID = n.EmployeeID
        WHERE n.CorrelationId = @CorrelationId AND n.Status = 0 AND n.NotificationType = 1;

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Reminder processing failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetNotificationErrors
    @ActingEmployeeID NVARCHAR(50),
    @Status INT = NULL,
    @NotificationType INT = NULL,
    @CourseId INT = NULL,
    @SessionId INT = NULL,
    @EmployeeSearch NVARCHAR(200) = NULL,
    @RetryableOnly BIT = NULL,
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @Skip INT = 0,
    @Take INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @Take IS NULL OR @Take < 1 SET @Take = 50;
        IF @Take > 500 SET @Take = 500;
        IF @Skip IS NULL OR @Skip < 0 SET @Skip = 0;

        SELECT @TotalCount = COUNT(*) FROM dbo.TrainingNotifications n WHERE (@Status IS NULL OR n.Status = @Status) AND n.Status = ISNULL(@Status, 2);

        SELECT
            n.Id, n.NotificationType, n.Channel, n.SessionId, n.RegistrationId, n.CertificateId,
            n.EmployeeID, dbo.fn_Training_EmpName(n.EmployeeID) AS EmployeeFullName,
            n.Status, n.AttemptCount,
            CONVERT(NVARCHAR(30), n.LastAttemptAt, 126) AS LastAttemptAt,
            n.LastError,
            CONVERT(NVARCHAR(30), n.InsertedAt, 126) AS InsertedAt,
            c.Name AS CourseName,
            CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
            CAST(CASE WHEN n.AttemptCount < 5 THEN 1 ELSE 0 END AS BIT) AS Retryable
        FROM dbo.TrainingNotifications n
        LEFT JOIN dbo.TrainingCourseSessions s ON s.Id = n.SessionId
        LEFT JOIN dbo.TrainingCourses c ON c.Id = ISNULL(n.CourseId, s.CourseId)
        WHERE n.Status = ISNULL(@Status, 2)
          AND (@NotificationType IS NULL OR n.NotificationType = @NotificationType)
          AND (@SessionId IS NULL OR n.SessionId = @SessionId)
        ORDER BY n.Id DESC
        OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Unable to load notification errors.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_RetryNotification
    @NotificationId INT,
    @ActingEmployeeID NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        DECLARE @Attempts INT;
        SELECT @Attempts = AttemptCount FROM dbo.TrainingNotifications WHERE Id = @NotificationId;
        IF @Attempts IS NULL BEGIN SET @ErrorCode = N'TRAINING_VALIDATION_FAILED'; SET @Message = N'Not found.'; GOTO DoneMeta; END
        IF @Attempts >= 5 BEGIN SET @ErrorCode = N'TRAINING_NOTIFICATION_RETRY_LIMIT_REACHED'; SET @Message = N'Retry limit.'; GOTO DoneMeta; END

        UPDATE dbo.TrainingNotifications
        SET Status = 0, UpdatedAt = GETDATE(), UpdatedByEmployeeID = @ActingEmployeeID
        WHERE Id = @NotificationId;

        SELECT @NotificationId AS NotificationId, 0 AS Status, AttemptCount, LastError
        FROM dbo.TrainingNotifications WHERE Id = @NotificationId;

        SET @EntityId = @NotificationId; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_CONFLICT'; SET @Message = N'Retry notification failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetTrainingDashboardStatistics
    @ActingEmployeeID NVARCHAR(50),
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CourseId INT = NULL,
    @CourseType NVARCHAR(100) = NULL,
    @DepartmentCode NVARCHAR(50) = NULL,
    @SessionStatus INT = NULL,
    @MandatoryOnly BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        SELECT
            (SELECT COUNT(*) FROM dbo.TrainingCourses WHERE Status = 1) AS ActiveCoursesCount,
            (SELECT COUNT(*) FROM dbo.TrainingCourseSessions WHERE Status = 1) AS OpenSessionsCount,
            (SELECT COUNT(*) FROM dbo.TrainingCourseSessions WHERE Status = 2) AS FullSessionsCount,
            (SELECT COUNT(*) FROM dbo.TrainingRegistrations WHERE CAST(RegisteredAt AS DATE) = CAST(GETDATE() AS DATE)) AS RegistrationsTodayCount,
            (SELECT COUNT(*) FROM dbo.TrainingRegistrations WHERE Status = 1) AS AttendancePendingCount,
            (SELECT COUNT(*) FROM dbo.TrainingCertificates WHERE Status IN (1, 4)) AS CertificatesIssuedCount,
            (SELECT COUNT(*) FROM dbo.TrainingNotifications WHERE Status = 2) AS NotificationErrorsCount,
            (SELECT COUNT(*) FROM dbo.TrainingCertificates WHERE ExpiresAt IS NOT NULL AND ExpiresAt <= DATEADD(DAY, 90, GETDATE()) AND Status IN (1, 4)) AS ExpiringCertificatesCount,
            CAST(NULL AS INT) AS SessionsInPeriodCount,
            CAST(NULL AS INT) AS TotalRegistrationsCount,
            CAST(NULL AS INT) AS ConfirmedAttendanceCount,
            CAST(NULL AS INT) AS AbsencesCount,
            CAST(NULL AS DECIMAL(9,2)) AS AttendanceRatePercent,
            CAST(NULL AS DECIMAL(9,2)) AS AverageCapacityUtilizationPercent,
            CAST(NULL AS INT) AS MissingMandatoryCount;

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_REPORT_DATA_UNAVAILABLE'; SET @Message = N'Dashboard stats failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetTrainingDashboardCharts
    @ActingEmployeeID NVARCHAR(50),
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CourseId INT = NULL,
    @CourseType NVARCHAR(100) = NULL,
    @DepartmentCode NVARCHAR(50) = NULL,
    @SessionStatus INT = NULL,
    @MandatoryOnly BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        SELECT
            N'monthly_registrations' AS ChartKey,
            N'Registrations by month' AS Title,
            CONVERT(NVARCHAR(7), r.RegisteredAt, 126) AS Label,
            CONVERT(DECIMAL(18,2), COUNT(*)) AS Value,
            CONVERT(NVARCHAR(30), GETDATE(), 126) AS GeneratedAt
        FROM dbo.TrainingRegistrations r
        WHERE (@FromDate IS NULL OR CAST(r.RegisteredAt AS DATE) >= @FromDate)
          AND (@ToDate IS NULL OR CAST(r.RegisteredAt AS DATE) <= @ToDate)
        GROUP BY CONVERT(NVARCHAR(7), r.RegisteredAt, 126)
        ORDER BY Label;

        SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_REPORT_DATA_UNAVAILABLE'; SET @Message = N'Dashboard charts failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_GetTrainingReports
    @ActingEmployeeID NVARCHAR(50),
    @ReportType NVARCHAR(50),
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CourseId INT = NULL,
    @SessionId INT = NULL,
    @DepartmentCode NVARCHAR(50) = NULL,
    @EmployeeID NVARCHAR(50) = NULL,
    @SessionStatus INT = NULL,
    @RegistrationStatus INT = NULL,
    @SortBy NVARCHAR(50) = NULL,
    @SortDescending BIT = 0,
    @Skip INT = 0,
    @Take INT = 50,
    @CourseType NVARCHAR(100) = NULL,
    @MandatoryOnly BIT = NULL,
    @LecturerEmployeeID NVARCHAR(50) = NULL,
    @Location NVARCHAR(200) = NULL,
    @AttendanceStatus INT = NULL,
    @CertificateStatus INT = NULL,
    @ExpiringWithinDays INT = 90,
    @ComplianceStatus INT = NULL,
    @ActiveEmployeesOnly BIT = NULL,
    @EmployeeSearch NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Success BIT = 0;
    DECLARE @ErrorCode NVARCHAR(100) = NULL;
    DECLARE @Message NVARCHAR(500) = NULL;
    DECLARE @CorrelationId NVARCHAR(32) = REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N'');
    DECLARE @TotalCount INT = NULL;
    DECLARE @EntityId INT = NULL;

    BEGIN TRY

        IF @ActingEmployeeID IS NULL OR LTRIM(RTRIM(@ActingEmployeeID)) = N''
        BEGIN
            SET @ErrorCode = N'TRAINING_UNAUTHORIZED';
            SET @Message = N'Acting employee is required.';
            GOTO DoneMeta;
        END

        IF @ReportType IS NULL OR LTRIM(RTRIM(@ReportType)) = N''
        BEGIN SET @ErrorCode = N'TRAINING_REPORT_INVALID_FILTER'; SET @Message = N'ReportType required.'; GOTO DoneMeta; END
        IF @Take IS NULL OR @Take < 1 SET @Take = 50;
        IF @Take > 500 SET @Take = 500;
        IF @Skip IS NULL OR @Skip < 0 SET @Skip = 0;
        IF @ExpiringWithinDays IS NULL SET @ExpiringWithinDays = 90;

        IF @ReportType = N'SessionCompletion'
        BEGIN
            SELECT
                s.Id AS SessionId, c.Name AS CourseName, c.CourseType,
                CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
                CONVERT(NVARCHAR(8), s.StartTime, 108) AS StartTime,
                CONVERT(NVARCHAR(8), s.EndTime, 108) AS EndTime,
                s.Location, dbo.fn_Training_EmpName(s.LecturerEmployeeID) AS LecturerName,
                s.Capacity,
                (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status IN (1,2,3,4)) AS RegisteredCount,
                (SELECT COUNT(*) FROM dbo.TrainingAttendance a WHERE a.SessionId = s.Id AND a.Status IN (1,3)) AS AttendedCount,
                (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status = 3) AS AbsentCount,
                (SELECT COUNT(*) FROM dbo.TrainingRegistrations r WHERE r.SessionId = s.Id AND r.Status = 0) AS CancelledRegistrationCount,
                CAST(0 AS DECIMAL(9,2)) AS CompletionRatePercent,
                CAST(0 AS DECIMAL(9,2)) AS CapacityUtilizationPercent,
                (SELECT COUNT(*) FROM dbo.TrainingCertificates cert WHERE cert.SessionId = s.Id AND cert.Status <> 0) AS CertificateCount,
                s.Status
            FROM dbo.TrainingCourseSessions s
            INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
            WHERE (@FromDate IS NULL OR s.SessionDate >= @FromDate)
              AND (@ToDate IS NULL OR s.SessionDate <= @ToDate)
              AND (@CourseId IS NULL OR s.CourseId = @CourseId)
            ORDER BY s.SessionDate DESC
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
        END
        ELSE IF @ReportType = N'Attendance'
        BEGIN
            SELECT
                r.EmployeeID, dbo.fn_Training_EmpName(r.EmployeeID) AS EmployeeFullName,
                e.DepartnentCode AS DepartmentCode, d.DepartnentDescripton AS DepartmentName,
                c.Name AS CourseName, s.Id AS SessionId,
                CONVERT(NVARCHAR(30), s.SessionDate, 23) AS SessionDate,
                r.Status AS RegistrationStatus,
                ISNULL(a.Status, 2) AS AttendanceStatus,
                CONVERT(NVARCHAR(30), a.ConfirmedAt, 126) AS ConfirmedAt,
                a.Source AS VerificationMethod,
                a.IsManualUpdate,
                CAST(NULL AS INT) AS CertificateStatus
            FROM dbo.TrainingRegistrations r
            INNER JOIN dbo.TrainingCourseSessions s ON s.Id = r.SessionId
            INNER JOIN dbo.TrainingCourses c ON c.Id = s.CourseId
            LEFT JOIN dbo.TrainingAttendance a ON a.RegistrationId = r.Id
            LEFT JOIN NAMER.dbo.EP_Employees e ON e.EmployeeID = r.EmployeeID
            LEFT JOIN NAMER.dbo.EP_Departnents d ON d.DepartnentCode = e.DepartnentCode
            WHERE (@EmployeeID IS NULL OR r.EmployeeID = @EmployeeID)
              AND (@DepartmentCode IS NULL OR e.DepartnentCode = @DepartmentCode)
              AND (@FromDate IS NULL OR s.SessionDate >= @FromDate)
              AND (@ToDate IS NULL OR s.SessionDate <= @ToDate)
            ORDER BY s.SessionDate DESC
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
        END
        ELSE IF @ReportType = N'ExpiringCertificates'
        BEGIN
            SELECT
                cert.Id AS CertificateId, cert.CertificateNumber, cert.EmployeeID,
                dbo.fn_Training_EmpName(cert.EmployeeID) AS EmployeeFullName,
                e.DepartnentCode AS DepartmentCode, d.DepartnentDescripton AS DepartmentName,
                c.Name AS CourseName,
                CONVERT(NVARCHAR(30), cert.IssuedAt, 126) AS IssuedAt,
                CONVERT(NVARCHAR(30), cert.ExpiresAt, 126) AS ExpiresAt,
                cert.Status, cert.EmailStatus,
                DATEDIFF(DAY, GETDATE(), cert.ExpiresAt) AS DaysUntilExpiry,
                CAST(CASE WHEN cert.FilePath IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS DownloadAvailable
            FROM dbo.TrainingCertificates cert
            INNER JOIN dbo.TrainingCourses c ON c.Id = cert.CourseId
            LEFT JOIN NAMER.dbo.EP_Employees e ON e.EmployeeID = cert.EmployeeID
            LEFT JOIN NAMER.dbo.EP_Departnents d ON d.DepartnentCode = e.DepartnentCode
            WHERE cert.ExpiresAt IS NOT NULL
              AND cert.ExpiresAt <= DATEADD(DAY, @ExpiringWithinDays, GETDATE())
              AND cert.Status IN (1, 4)
            ORDER BY cert.ExpiresAt
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
        END
        ELSE
        BEGIN
            /* CourseSummary / EmployeeTraining / Compliance — simple course list fallback */
            SELECT c.Id AS CourseId, c.Code AS CourseCode, c.Name AS CourseName, c.CourseType, c.IsMandatory,
                   (SELECT COUNT(*) FROM dbo.TrainingCourseSessions s WHERE s.CourseId = c.Id) AS SessionCount,
                   CAST(0 AS INT) AS RegisteredCount,
                   CAST(0 AS INT) AS AttendedCount,
                   CAST(NULL AS INT) AS AbsentCount,
                   CAST(NULL AS DECIMAL(9,2)) AS AttendanceRatePercent,
                   CAST(NULL AS DECIMAL(9,2)) AS AverageCapacityUtilizationPercent,
                   CAST(0 AS INT) AS CertificateCount,
                   CAST(NULL AS INT) AS ExpiringOrExpiredCertificateCount,
                   CAST(NULL AS NVARCHAR(30)) AS LastSessionDate
            FROM dbo.TrainingCourses c
            WHERE (@CourseId IS NULL OR c.Id = @CourseId)
              AND (@MandatoryOnly IS NULL OR c.IsMandatory = @MandatoryOnly)
            ORDER BY c.Name
            OFFSET @Skip ROWS FETCH NEXT @Take ROWS ONLY;
        END

        SET @TotalCount = @@ROWCOUNT; SET @Success = 1; SET @Message = N'OK';
    END TRY
    BEGIN CATCH
        SET @ErrorCode = N'TRAINING_REPORT_DATA_UNAVAILABLE'; SET @Message = N'Report failed.';
    END CATCH
DoneMeta:

    SELECT @Success AS Success, @ErrorCode AS ErrorCode, @Message AS Message,
           @CorrelationId AS CorrelationId, @TotalCount AS TotalCount, @EntityId AS EntityId;

END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Training_ExportTrainingReportToExcel
    @ActingEmployeeID NVARCHAR(50),
    @ReportType NVARCHAR(50),
    @FromDate DATE = NULL,
    @ToDate DATE = NULL,
    @CourseId INT = NULL,
    @SessionId INT = NULL,
    @DepartmentCode NVARCHAR(50) = NULL,
    @EmployeeID NVARCHAR(50) = NULL,
    @SessionStatus INT = NULL,
    @RegistrationStatus INT = NULL,
    @SortBy NVARCHAR(50) = NULL,
    @SortDescending BIT = 0,
    @Skip INT = 0,
    @Take INT = 500,
    @CourseType NVARCHAR(100) = NULL,
    @MandatoryOnly BIT = NULL,
    @LecturerEmployeeID NVARCHAR(50) = NULL,
    @Location NVARCHAR(200) = NULL,
    @AttendanceStatus INT = NULL,
    @CertificateStatus INT = NULL,
    @ExpiringWithinDays INT = 90,
    @ComplianceStatus INT = NULL,
    @ActiveEmployeesOnly BIT = NULL,
    @EmployeeSearch NVARCHAR(200) = NULL,
    @Format NVARCHAR(20) = N'xlsx'
AS
BEGIN
    SET NOCOUNT ON;
    /* Excel file is built in C#. This returns the same rows as GetTrainingReports. */
    EXEC dbo.usp_Training_GetTrainingReports
        @ActingEmployeeID=@ActingEmployeeID, @ReportType=@ReportType, @FromDate=@FromDate, @ToDate=@ToDate,
        @CourseId=@CourseId, @SessionId=@SessionId, @DepartmentCode=@DepartmentCode, @EmployeeID=@EmployeeID,
        @SessionStatus=@SessionStatus, @RegistrationStatus=@RegistrationStatus, @SortBy=@SortBy,
        @SortDescending=@SortDescending, @Skip=@Skip, @Take=@Take, @CourseType=@CourseType,
        @MandatoryOnly=@MandatoryOnly, @LecturerEmployeeID=@LecturerEmployeeID, @Location=@Location,
        @AttendanceStatus=@AttendanceStatus, @CertificateStatus=@CertificateStatus,
        @ExpiringWithinDays=@ExpiringWithinDays, @ComplianceStatus=@ComplianceStatus,
        @ActiveEmployeesOnly=@ActiveEmployeesOnly, @EmployeeSearch=@EmployeeSearch;
END
GO

PRINT 'Training Management install complete.';
GO
