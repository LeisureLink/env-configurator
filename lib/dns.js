/*jshint loopfunc: true */
var dns = require('dns')
  , assert = require('assert-plus')
  , formatters = require('./formatters.js')
  , async = require('async')
  , jptr = require('json-ptr');

/**
 * dnsConfigDone is callback function called by the dns module when DNS SRV record configuration is complete
 * 
 * @callback dnsConfigDone
 * @param {object} err - An error object returned if an error occurred, if err = true then there is no guarantee of config being valid
 * @param {object} config - An object representing the service configuration retrieved from DNS
 */


module.exports = (function() { 
  'use strict';
  
  /**
   * Sorts DNS srv records by priority in weight in asc order
   * @param {object} p - A DNS record returned from node's DNS @link{http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback|resolveSrv call}
   * @param {number} p.priority - The priority of the SRV record
   * @param {number} p.weight - The weight of the SRV record
   * @param {object} q - A DNS record returned from node's DNS @link{http://nodejs.org/api/dns.html#dns_dns_resolvesrv_hostname_callback|resolveSrv call}
   * @param {number} q.priority - The priority of the SRV record
   * @param {number} q.weight - The weight of the SRV record 
   * @returns {number} A positive or negative number indicating ordering of p & q
   */
  function sortDNSSrvRecords(p, q) {
    var retVal = p.priority - q.priority;
    if (retVal === 0) {
      retVal = q.weight - p.weight;
    }
    return retVal;
  }
  
  /**
   * dns task is intended to be used with async parallel to make 'simultaneous' DNS SRV requests. This function
   * expect to the have the service its configurging to be bound to 'this' before being called
   * 
   * @param {object} callback - A callback object that accepts an error and a config object
   */
  function makeDnsTask(service) {
    return function dnsTask(callback) {
      dns.resolveSrv(service.name, function (err, addresses) {
        if (err) {
          //we swallow the error since it error cases we want to fall back to 
          //other config means
          //TODO: add logger here
          callback(null, {
            "service": service,
            "addresses": null
          });
        } else {
          callback(null, {
            "service": service,
            "addresses": addresses
          });
        }
      });
    }
  }

  /**
  * Attempts to provide a configuration object based on DNS SRV records
  * @name module:dns
  * @param {object} configSpec - Specifies the services to look up and what, if any formatter to use, note if this is empty
  * the module will do nothing
  * @param {object[]} [configSpec.services=[]] - An array of objects that define the services to lookup in DNS  
  * @param {object} config - A configuration object which may contain properties referred to by the service suffix prefix fields
  * @param {dnsConfigDone} dnsConfigDone - A callback function to call when DNS configuration is complete
  */
  function determineConfiguration(configSpec, config, dnsConfigDone) {
    var requests = configSpec || {}
    , idx
    , dnsRequestTasks = {}
    , service;
    assert.func(dnsConfigDone, 'dnsConfigDone');
    requests.services = requests.services || [];
    
    for (idx = 0; idx < requests.services.length; idx++) {
      service = requests.services[idx];
      assert.string(service.name, 'service.name');
      dnsRequestTasks[service.name] = makeDnsTask(service);
    }

    async.parallelLimit(dnsRequestTasks, 3, function (err, srvResults) {
      var propName,
          result = {},
          currentAddresses,
          service,
          preConfiguredService,
          prefix,
          suffix;
      if (err) {
        dnsConfigDone(err, null);
      } else {
        for (propName in srvResults) {
          if (!srvResults.hasOwnProperty(propName)) {
            continue;
          }
          currentAddresses = srvResults[propName].addresses;
          service = srvResults[propName].service;
          if (service.prefix) {
            prefix = jptr.create(service.prefix).get(config) || '';
          } else {
            prefix = '';
          }
          if (service.suffix) {
            suffix = jptr.create(service.suffix).get(config) || '';
          } else {
            suffix = '';
          }
          if (currentAddresses) { //did the DNS lookup succeed?
            currentAddresses.sort(sortDNSSrvRecords);
            if (service.formatter !== undefined && formatters[service.formatter] !== undefined) {
              result[service.name] = {
                value: formatters[service.formatter](currentAddresses, prefix, suffix),
                key: service.key
              };
            } else {
              result[service.name] = {
                value: currentAddresses[0].name,
                key: service.key
              };
            }
          } else {
            preConfiguredService = jptr.create(service.key).get(config);
            if (preConfiguredService) {
              result[service.name] = {
                value: prefix + preConfiguredService + suffix,
                key: service.key
              };
            }
          }
        }
        dnsConfigDone(null, result);
      }
    });
  }

  return determineConfiguration;
})();