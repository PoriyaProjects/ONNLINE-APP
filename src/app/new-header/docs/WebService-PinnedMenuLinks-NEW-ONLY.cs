// =============================================================================
// WebService-PinnedMenuLinks-NEW-ONLY.cs — paste into WebService.cs
// =============================================================================
// PREREQUISITE: copy PinnedMenuLinksService.cs into App_Code
//               (same folder as WebService.cs).
//
// Field — add ONCE inside the WebService class:
//
//   PinnedMenuLinksService _PinnedMenuLinksService = new PinnedMenuLinksService();
// =============================================================================

[WebMethod]
public List<string> GetPinnedMenuLinks(string userName)
{
    return _PinnedMenuLinksService.GetPins(userName);
}

[WebMethod]
public bool SavePinnedMenuLinks(string userName, string pinnedIdsJson)
{
    return _PinnedMenuLinksService.SavePins(userName, pinnedIdsJson);
}

[WebMethod]
public int GetPinnedMenuQuota(string userName)
{
    return _PinnedMenuLinksService.GetQuota(userName);
}

[WebMethod]
public bool LogPinnedMenuAction(string userName, string action, string pinKey, string linkId, string linkDescription)
{
    return _PinnedMenuLinksService.LogAction(userName, action, pinKey, linkId, linkDescription);
}

[WebMethod]
public PinnedMenuBiResult GetPinnedMenuBi()
{
    return _PinnedMenuLinksService.GetBi();
}

[WebMethod]
public bool SetPinnedMenuUserQuota(string userName, int maxPins, string updatedBy)
{
    return _PinnedMenuLinksService.SetQuota(userName, maxPins, updatedBy);
}
