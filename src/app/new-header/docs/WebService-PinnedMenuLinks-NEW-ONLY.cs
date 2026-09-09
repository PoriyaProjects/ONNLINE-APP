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
