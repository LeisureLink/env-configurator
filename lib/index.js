
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
  
  /**
   * Handles a callback from Node's DNS module for resolve SRV records
   * @name module:lib#resolveSrcCallback
   * @param {object} serviceRequest - The current config object used to request a DNS srv record
   */
  function resolveSrvCallback(serviceRequest) {
    
    return function (err, addresses) {
      if (!err) {
        addresses.sort(function (p, q) {
          var retVal = q.priority - p.priority;
          if (retVal === 0) {
            retVal = p.weight = q.weight;
          }
          return retVal;
        });
        if (serviceRequest.formatter !== undefined && formatters[serviceRequest.formatter] !== undefined) {
          result[serviceRequest.name] = formatters[serviceRequest.formatter](addresses, serviceRequest.prefix, serviceRequest.suffix);
        } else {
          result[serviceRequest.name] = addresses[0].name;
        }
      }
    };
  }
  
  var requests = config || {}
    , result = {};
  requests.services = requests.services || [];
  for (var i = 0; i < requests.services.length; i++) {
    var service = requests.services[i];
    assert.string(service.name, 'service.name');
    dns.resolveSrv(service.name, resolveSrvCallback(service));
  }
  callback(result);
};