/**
 * Dev-server proxy for local API calls.
 *
 * WebService.asmx is proxied via /ws-api (not /WebService.asmx) because
 * webpack-dev-server treats paths with file extensions as static assets and
 * returns "Cannot POST /WebService.asmx/..." instead of forwarding.
 */
const PROXY_CONFIG = [
  {
    context: ['/ws-api'],
    target: 'http://localhost:64964',
    secure: false,
    changeOrigin: true,
    logLevel: 'warn',
    pathRewrite: {
      '^/ws-api': '/WebService.asmx',
    },
  },
  {
    context: ['/billing-pipeline'],
    target: 'https://d1xxyoxurq9u57.cloudfront.net',
    secure: true,
    changeOrigin: true,
    logLevel: 'warn',
    pathRewrite: {
      '^/billing-pipeline': '',
    },
  },
];

module.exports = PROXY_CONFIG;
