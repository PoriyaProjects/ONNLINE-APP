-- Patch: QR token expiry must use SQL local clock (GETDATE) — hospital convention, not UTC.
-- Also reject expired/closed tokens in GetAttendanceSessionByToken before the identity form.
-- Run against Forms (or the DB that hosts TrainingCourseSessions).

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
