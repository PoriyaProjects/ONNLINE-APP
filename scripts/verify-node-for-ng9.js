/**
 * Angular 9 + @angular-devkit/build-angular@9 uses a dev-server stack that
 * calls process.binding('http_parser'), removed in Node.js 24+.
 */
'use strict';

const major = parseInt(process.version.slice(1).split('.')[0], 10);

if (major >= 24) {
  console.error('');
  console.error('This project (Angular 9) cannot run on Node.js ' + process.version + '.');
  console.error('Use Node 18 LTS or 20 LTS (any version strictly below 24).');
  console.error('');
  console.error('Examples:');
  console.error('  nvm-windows:  nvm install 18   then   nvm use 18');
  console.error('  Or install:  https://nodejs.org/  (choose 18.x or 20.x LTS)');
  console.error('');
  process.exit(1);
}
