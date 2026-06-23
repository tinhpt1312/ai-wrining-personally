'use strict';

require('reflect-metadata');

const handler = require('../dist/serverless').default;

module.exports = handler;
module.exports.default = handler;
