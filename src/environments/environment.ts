// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  url: 'http://localhost:64964/WebService.asmx/',
  urlipracticom: 'http://localhost:64964/WebService.asmx/',
  AuthUrl: 'http://localhost:64964/WebService.asmx/',
  /** When set (e.g. https://host/api/nurse-permissions/), REST endpoints are used instead of ASMX method names. */
  nursePermissionsApiBase: '',
  /**
   * Override host for GET `{base}/api/hearing/details`.
   * Empty: use `AuthUrl` if it is an `/api/` host; otherwise same origin as `url` (WebService folder stripped).
   */
  hearingDetailsApiBase: '',
  /** EP EmployeeID (string) sent as user_id on every NPS WebService.asmx/Nps* call. */
  npsUserId: '',
  production: false
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
