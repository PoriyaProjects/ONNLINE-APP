# Backend Fix Guide - JSON Response Issue

## Problem
The `GetAllPreparations` endpoint is returning XML instead of JSON, causing a parsing error in the frontend.

## Root Cause
Your WCF/ASMX web service is configured to return JSON (`ResponseFormat = WebMessageFormat.Json`), but the binding configuration may not be properly set up to actually return JSON format.

## Solutions

### Solution 1: Update WCF Configuration (RECOMMENDED)

In your `web.config`, ensure you have the `webHttpBinding` configured:

```xml
<system.serviceModel>
  <behaviors>
    <endpointBehaviors>
      <behavior name="webBehavior">
        <webHttp helpEnabled="true" faultExceptionEnabled="true" />
      </behavior>
    </endpointBehaviors>
  </behaviors>
  
  <bindings>
    <webHttpBinding>
      <binding name="webBinding">
        <readerQuotas maxDepth="32" maxStringContentLength="8192" maxArrayLength="16384" 
                      maxBytesPerXmlDocument="4194304" maxNameTableCharCount="16384" />
        <security mode="None" />
      </binding>
    </webHttpBinding>
  </bindings>
  
  <services>
    <service name="YourNamespace.YourServiceClass">
      <endpoint binding="webHttpBinding" bindingConfiguration="webBinding" 
                behaviorConfiguration="webBehavior" contract="YourNamespace.IYourService" />
    </service>
  </services>
</system.serviceModel>
```

### Solution 2: Modify Backend Method

Ensure your service methods are correctly decorated:

```csharp
[ServiceContract]
public interface IOralPreparationService
{
    [OperationContract]
    [WebGet(UriTemplate = "GetAllPreparations", ResponseFormat = WebMessageFormat.Json)]
    List<OralPreparation> GetAllPreparations();
    
    [OperationContract]
    [WebInvoke(Method = "POST", UriTemplate = "SaveOrUpdatePreparation", 
               ResponseFormat = WebMessageFormat.Json, RequestFormat = WebMessageFormat.Json)]
    int SaveOrUpdatePreparation(OralPreparation prep);
}
```

### Solution 3: Test the Endpoint

Test directly in browser or with curl:

```bash
# Test if endpoint returns JSON
curl -H "Accept: application/json" "http://srv-apps-prod/RCF_WS/WebService.asmx/GetAllPreparations"

# Should return JSON like:
# [{"id":1,"preparationName":"Medicine","concentration":"500mg",...}]

# NOT XML like:
# <?xml version="1.0"?>
```

### Solution 4: Alternative - Return as String

If binding configuration is complex, modify the backend to return as string (already JSON-encoded):

```csharp
[WebGet(UriTemplate = "GetAllPreparations", ResponseFormat = WebMessageFormat.Json)]
public string GetAllPreparations()
{
    var medications = // get from DB
    return JsonConvert.SerializeObject(medications);
}
```

## Verification

After making changes:

1. Restart your WCF service
2. Test endpoint in browser:
   ```
   http://srv-apps-prod/RCF_WS/WebService.asmx/GetAllPreparations
   ```
3. Should return plain JSON array, not XML
4. Then frontend will work correctly

## Expected JSON Response Format

```json
[
  {
    "id": 1,
    "preparationName": "Aspirin",
    "concentration": "500mg",
    "finalVolume": "100ml",
    "routeOfAdministration": "Oral",
    "rawMaterials": "ASA",
    "suspendingAgent": "Water",
    "shelfLife": "2 years",
    "storageConditions": "Room temperature",
    "usageNotes": "Take with food"
  }
]
```

## Frontend Workaround (TEMPORARY)

The modal component has been updated to attempt to handle both XML and JSON responses. However, **the proper fix is on the backend**.

See: `src/app/mersham/medication-selector-modal.component.ts` - `loadMedications()` method

This is a temporary solution only and should not be relied upon for production.

## Quick Checklist

- [ ] Verify `webHttpBinding` is configured in web.config
- [ ] Check `ResponseFormat = WebMessageFormat.Json` in attributes
- [ ] Test endpoint directly in browser
- [ ] Should return JSON (starts with `[` or `{`), not XML (starts with `<?xml`)
- [ ] Restart IIS/service after changes
- [ ] Clear browser cache
- [ ] Test frontend again

## Support

If you're unsure about WCF configuration:
1. Contact your backend team
2. Check if there's a web.config in the WCF service project
3. Verify the binding configuration matches above
4. Test the endpoint directly before trying from frontend
