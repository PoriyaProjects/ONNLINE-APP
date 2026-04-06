export const environment = {
  url: 'http://srv-apps-prod/RCF_WS/WebService.asmx/',
  urlipracticom: 'http://srv-ipracticom:8080/WebService.asmx/',
  AuthUrl: 'http://srv-apps-prod:47001/api/',
  /** Set only if hearing API is not on the same origin as AuthUrl (default: empty → http://srv-apps-prod:47001). */
  hearingDetailsApiBase: '',
  nursePermissionsApiBase: '',
  npsUserId: '',
  production: true
};
/*
export const environment = {
  url: 'http://srv-apps-test/RCF_WS/WebService.asmx/',
  urlipracticom: 'http://srv-ipracticom:8080/WebService.asmx/',
  AuthUrl: 'http://srv-apps-test:47001/api/',
  hearingDetailsApiBase: '',
  production: true
};*/
