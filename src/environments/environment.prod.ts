export const environment = {
  url: 'http://srv-apps-prod/RCF_WS/WebService.asmx/', // ***production environment **** .
  // url: 'http://srv-apps-prod:999/WebService.asmx/', // ***development environment **** .
    urlipracticom: 'http://srv-ipracticom:8080/WebService.asmx/',
  AuthUrl: 'http://srv-apps-prod:47001/api/',
  hearingDetailsAsmxBase: '',
  serviceCrmApiUrl: 'http://srv-apps-prod:5769/api/ServiceCRM',
  billingPipelineApiUrl: 'https://d1xxyoxurq9u57.cloudfront.net',
  billingPipelineProxyPath: '/billing-pipeline',
  billingPipelineMode: 'server',
  npsUserId: localStorage.getItem('ID'),
  production: true
};
/*
export const environment = {
  url: 'http://srv-apps-test/RCF_WS/WebService.asmx/',
  urlipracticom: 'http://srv-ipracticom:8080/WebService.asmx/',
  AuthUrl: 'http://srv-apps-test:47001/api/',
  hearingDetailsAsmxBase: '',
  production: true
};*/
