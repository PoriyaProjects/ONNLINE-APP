-- Persist FilePath after C# writes the certificate PDF.
-- Required for TrainingCertificatePdfWriter (GetCertificateForPdf / SetCertificateFile).
-- Also adds EmployeeID on download so ownership checks work.
-- Run against Forms.

USE [Forms];
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
