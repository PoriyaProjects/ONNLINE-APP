-- Issue certificates on attendance confirm (Status=1 Issued) instead of leaving them Pending (3).
-- Also upgrades existing pending rows. Run against Forms.

UPDATE cert
SET cert.Status = 1,
    cert.IssuedAt = ISNULL(cert.IssuedAt, GETDATE()),
    cert.ExpiresAt = CASE
        WHEN cert.ExpiresAt IS NOT NULL THEN cert.ExpiresAt
        WHEN c.ValidityMonths IS NOT NULL AND c.ValidityMonths > 0
        THEN DATEADD(MONTH, c.ValidityMonths, ISNULL(cert.IssuedAt, GETDATE()))
        ELSE NULL
    END,
    cert.UpdatedAt = GETDATE()
FROM dbo.TrainingCertificates cert
INNER JOIN dbo.TrainingCourses c ON c.Id = cert.CourseId
WHERE cert.Status = 3
  AND EXISTS (
      SELECT 1 FROM dbo.TrainingAttendance a
      WHERE a.Id = cert.AttendanceId AND a.Status IN (1, 3)
  );
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
                   CONVERT(NVARCHAR(30), @SessionDate, 23) AS SessionDate
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
            -- Status 1 = Issued. PDF/email stay optional (FilePath remains NULL until processing is enabled).
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
               CONVERT(NVARCHAR(30), @SessionDate, 23) AS SessionDate;

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
               cert.Status, CAST(0 AS BIT) AS DownloadAvailable,
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
