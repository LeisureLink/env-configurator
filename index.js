var getConfig = require('./lib');
/**
 * Exports the components from the dns-configurator library
 * @param {object} config - A config object that defines what SRV records the dns configurator to attempt to lookup, note if this is empty the library
 * will do nothing
 * @param {object} callback - A callback function provided by the application in case it wants notification of when configuration is complete
 * and the configuration data
 * @module env-configurator
 */
module.exports = function getDefaults(config, callback) {
  'use strict';
  var names = config || {};
  getConfig(names, callback);
};