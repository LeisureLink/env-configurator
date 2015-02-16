
var dns = require('dns')
  , assert = require('assert-plus')
  ,formatters = require('./formatters.js');
/**
 * Attempts to provide a configuration object based on DNS SRV records
 * @module lib
 * @param {object} config - Specifies the services to look up and what, if any formatter to use, note if this empty
 * the module will do nothing
 * @param {object} callback - A callback function to call when DNS configuration is complete
 */
module.exports = function determineConfiguration(config, callback) {
  'use strict';
  assert.func(callback, 'callback');
  function resolveSrvCallback(err, addresses) {
    if (!err) {
      addresses.sort(function (p, q) {
        var retVal = q.priority - p.priority;
        if (retVal === 0) {
          retVal = p.weight = q.weight;
        }
        return retVal;
      });
      if (service.formatter !== undefined && formatters[service.formatter] !== undefined) {
        result[service.name] = formatters[service.formatter](addresses);
      } else {
        result[service.name] = addresses[0].name;
      }
    }
  }
  
  var requests = config || {}
    , result = {};
  requests.services = requests.services || [];
  for (var i = 0; i < requests.services.length; i++) {
    var service = requests.services[i];
    assert.string(service.name, 'service.name');
    dns.resolveSrv(service.name, resolveSrvCallback);
  }
  callback(result);
};