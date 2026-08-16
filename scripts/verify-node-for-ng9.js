/**
 * Angular 9 + @angular-devkit/build-angular@9:
 * - Node 24+: dev-server uses process.binding('http_parser') (removed).
 * - Node 22+ on Windows: production build often fails at TerserPlugin (write UNKNOWN).
 */
'use strict';

const major = parseInt(process.version.slice(1).split('.')[0], 10);

if (major >= 22) {
  console.error('');
  console.error('This project (Angular 9) cannot run on Node.js ' + process.version + '.');
  console.error('Use Node 18 LTS or 20 LTS (major version 18 or 20).');
  console.error('');
  console.error('Examples:');
  console.error('  nvm-windows:  nvm install 18   then   nvm use 18');
  console.error('  Or install:  https://nodejs.org/  (choose 18.x or 20.x LTS)');
  console.error('');
  process.exit(1);
}
