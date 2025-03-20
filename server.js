#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require("stremio-addon-sdk");
const addonInterface = require("./addon");
serveHTTP(addonInterface, { port: process.env.PORT || 7000 });

cacheMaxAge: parseInt(process.env.CACHE_MAX_AGE) || 1 * 60;
// when you've deployed your addon, un-comment this line
publishToCentral("https://bbab4a35b833-more-like-this.baby-beamup.club/manifest.json");
// for more information on deploying, see: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/README.md
