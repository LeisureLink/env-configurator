/*jshint loopfunc: true */
var dns = require('dns')
  , assert = require('assert-plus')
  , formatters = require('./formatters.js')
  , async = require('async');

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
 * dnsConfigDone is callback function called by the dns module when DNS SRV record configuration is complete
 * 
 * @callback dnsConfigDone
 * @param {object} err - An error object returned if an error occurred, if err = true then there is no guarantee of config being valid
 * @param {object} config - An object representing the service configuration retrieved from DNS
 */

/**
* Attempts to provide a configuration object based on DNS SRV records
* @module dns
* @param {object} config - Specifies the services to look up and what, if any formatter to use, note if this is empty
* the module will do nothing
* @param {object[]} [config.services=[]] - An array of objects that define the services to lookup in DNS  
* @param {dnsConfigDone} dnsConfigDone - A callback function to call when DNS configuration is complete
*/
module.exports = function determineConfiguration(config, dnsConfigDone) {
  'use strict';
  assert.func(dnsConfigDone, 'dnsConfigDone');
  var requests = config || {}
    , result = {}
    , idx
    , dnsRequestTasks = {};
  requests.services = requests.services || [];
  for (idx = 0; idx < requests.services.length; idx++) {
    var service = requests.services[idx];
    assert.string(service.name, 'service.name');
    
    //MSH 2015-03-02: Unfortunately I couldn't think of a clean way of doing this without
    //creating the below functions in a loop. Fortunately, since this is a service configuration
    //array the total number of iterations should be relativly small, minimizing any costs
    dnsRequestTasks[service.name] = function (callback) {
      dns.resolveSrv(service.serviceName, function (err, addresses) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, {
            "service": service,
            "addresses": addresses
          });
        }
      });
    };
  }
  async.parallelLimit(dnsRequestTasks, 3, function (err, srvResults) {
    var idx,
        currentAddresses,
        service;
    if (err) {
      dnsConfigDone(err, null);
    } else {
      for (idx = 0; idx < srvResults.length; idx++) {
        currentAddresses = srvResults[idx].addresses;
        service = srvResults[idx].service;
        currentAddresses.sort(sortDNSSrvRecords);
        if (service.formatter !== undefined && formatters[service.formatter] !== undefined) {
          result[service.name] = {
            value: formatters[service.formatter](currentAddresses, service.prefix, service.suffix),
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
};