/*
  Menu entry for ONNLINE.
  LinkId is the Angular hash route: #/doctors-permissions
  Grant access per user in LinksPermissions (UserId = ADUserName).
  The module still enforces employee / manager / admin scope on the server.
*/
SET NOCOUNT ON;

IF NOT EXISTS (
    SELECT 1 FROM [OnnLine].[dbo].[Links] WHERE [LinkId] = N'doctors-permissions'
)
BEGIN
    INSERT INTO [OnnLine].[dbo].[Links] ([LinkId], [LinkDescription], [LinkStatus], [Order], [SubToLinkId])
    VALUES (N'doctors-permissions', N'הרשאות רופאים', N'1', 900, 0);
END
ELSE
BEGIN
    UPDATE [OnnLine].[dbo].[Links]
    SET [LinkDescription] = N'הרשאות רופאים',
        [LinkStatus] = N'1'
    WHERE [LinkId] = N'doctors-permissions';
END
GO

/*
  A top-level link stays hidden until this grant exists.
  UserId is ADUserName, not EmployeeID. LinkRowId is the LinkId string.

  INSERT INTO [OnnLine].[dbo].[LinksPermissions] ([LinkRowId], [UserId], [Status])
  VALUES (N'doctors-permissions', N'AD_USER_NAME', N'1');
*/
