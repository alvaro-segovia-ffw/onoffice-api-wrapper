'use strict';

const path = require('path');
const { loadDotEnv } = require('./lib/load-dotenv');
const { runApartmentExport } = require('./lib/apartment-export');

loadDotEnv(path.join(process.cwd(), '.env'));

runApartmentExport()
  .then((result) => {
    console.log(
      `OK: ${result.outputFilePath} generated with apartments and images. Apartments: ${result.apartments}`
    );
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
