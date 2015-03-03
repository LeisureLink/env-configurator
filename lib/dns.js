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
   */
  function sortDNSSrvRecords(p, q) {
    'use strict';
    var retVal = q.priority - p.priority;
    if (retVal === 0) {
      retVal = p.weight = q.weight;
    }
    return retVal;
  }
  
  /**
   * dns task is intended to be used with async parallel to make 'simultaneous' DNS SRV requests. This function
   * expect to the have the service its configurging to be bound to 'this' before being called
   * 
   * @param {object} callback - A callback object that accepts an error and a config object
   */
  function dnsTask(callback) {
    var that = this;
    dns.resolveSrv(that.serviceName, function (err, addresses) {
      if (err) {
        callback(err, null);
      } else {
        callback(null, {
          "service": that,
          "addresses": addresses
        });
      }
    });
  };

  /**
  * Attempts to provide a configuration object based on DNS SRV records
  * @name module:dns
  * @param {object} configSpec - Specifies the services to look up and what, if any formatter to use, note if this is empty
  * the module will do nothing
  * @param {object} config - A configuration object which may contain properties referred to by the service suffix prefix fields
  * @param {object[]} [configSpec.services=[]] - An array of objects that define the services to lookup in DNS  
  * @param {dnsConfigDone} dnsConfigDone - A callback function to call when DNS configuration is complete
  */
  function determineConfiguration(configSpec, config, dnsConfigDone) {
    var requests = configSpec || {}
    , result = {}
    , idx
    , dnsRequestTasks = {}
    , service;
    assert.func(dnsConfigDone, 'dnsConfigDone');
    requests.services = requests.services || [];
    
    for (idx = 0; idx < requests.services.length; idx++) {
      service = requests.services[idx];
      assert.string(service.name, 'service.name');
      dnsRequestTasks[service.name] = dnsTask.bind(service);
    }

    async.parallelLimit(dnsRequestTasks, 3, function (err, srvResults) {
      var idx,
          currentAddresses,
          service,
          prefix,
          suffix;
      if (err) {
        dnsConfigDone(err, null);
      } else {
        for (idx = 0; idx < srvResults.length; idx++) {
          currentAddresses = srvResults[idx].addresses;
          service = srvResults[idx].service;
          currentAddresses.sort(sortDNSSrvRecords);
          if (service.formatter !== undefined && formatters[service.formatter] !== undefined) {
            if (service.prefix) {
              prefix = jptr.create(service.prefix).get(config);
            }
            if (service.suffix) {
              suffix = jptr.create(service.suffix).get(config);
            }
            prefix = prefix || '';
            suffix = suffix || '';
            result[service.name] = {
              value: formatters[service.formatter](currentAddresses, prefix, suffix),
              key: service.key
            };
          } else {
            result[service.name] = {
              value: currentAddresses [0].name,
              key: service.key
            };
          }
        }
        dnsConfigDone(null, result);
      }
    });
  }

  return determineConfiguration;
})();