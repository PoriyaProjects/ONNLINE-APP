-- Patch: planned attendance open/close on sessions (safe for already-installed DBs).
-- Run against Forms (or the DB that hosts TrainingCourseSessions).

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

-- Re-apply GetSessionDetails + SaveSession from training-management.sql
-- (CREATE OR ALTER blocks below).

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
                UpdatedAt=SYSUTCDATETIME(), UpdatedByEmployeeID=@ActingEmployeeID
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
