var resolveSrv = require('./dns.js'),
    EventEmitter = require('events').EventEmitter,
    jptr = require('json-ptr'),
    assert = require('assert-plus');
/**
* Attempts to provide a configuration based on a required configuration input
* @module lib
* @param {object} config - Specifies the services and key-value pairs to look up 
* @param {object} callback - A callback function to call when configuration is complete (or failed)
*/
module.exports = (function () {
  'use strict';
  
  var CONSUL_HOST = 'CONSUL_HOST',
      CONSUL_PORT = 'CONSUL_PORT',
      CONSUL_SECURE = 'CONSUL_SECURE',
      ee = new EventEmitter();
  
  /**
   * @name module:lib#configurer
   * @constr
   */
  var configurer = {};
  
  /**
   * Determines if we should use a consul agent to add configuration
   * @param {object} configurationRequest - A configuration request object that may contain information required to contact a consul agent
   * @returns {object} A reference to an active consule agent if one could be configured, undefined otherwise
   */
  function setupConsul(configRequest) {
    //client must fully specify how we will talk to consul
    var consulClient,
        consulHost = process.env[CONSUL_HOST],
        consulPort = process.env[CONSUL_PORT],
        consulSecure = process.env[CONSUL_SECURE];
    if (consulHost !== undefined &&
    consulPort !== undefined &&
    consulSecure !== undefined) {
      consulClient = require('consul')({
        host: consulHost,
        port: consulPort,
        secure: consulSecure
      });
    }
    return consulClient;
  }
  
  /**
   * Handles the retrieval of KV pairs from a consul agent, if the given consulClient isn't defined then
   * the method is a no-op
   * @param {object} configRequest - A client provided object that may have a key value section for required key value pairs
   * @param {object[]} errors - An initially null array of errors that can be added as configuration is processed
   * @param {object} consulClient - A pre-configured client used to communicate with a consul agent, may be undefined to indicate that
   * we are not supposed to use consul
   * @param {object} finalConfig - A object in which to store the retrieved configuration
   */
  function processKeyValuePairsInConsul(configRequest, consulClient, errors, finalConfig) {
    var requestedKeys = configRequest.keys,
        requestedKey,
        pathPrefixIdx,
        idx,
        foundKeyIdx,
        resultPtr;
    if (consulClient !== undefined) {
      consulClient.kv.get({
        key: configRequest.name + '/',
        recurse: true
      }, function (err, result) {
        if (err) {
          if (errors === null) {
            errors = null;
          }
          errors.push(err);
        } else {
          for (idx = 0; idx < result.length; idx++) {
            pathPrefixIdx = result[idx].Key.indexOf(configRequest.name);
            var foundKeyIdx = requestedKeys.indexOf('#' + result[idx].Key.slice(pathPrefixIdx + configRequest.name.length));
            if (foundKeyIdx !== -1) {
              requestedKey = requestedKeys[foundKeyIdx];
              resultPtr = jptr.create(requestedKey);
              resultPtr.set(finalConfig, result[idx].Value);
            }
          }
        }
      });
    }
    ee.emit('consul-config-done', configRequest, errors, finalConfig);
  }
  
  /**
   * Handles the retrieval of KV pairs from the application's runtime environment
   * @param {object} configRequest - A client provided object that may have a key value section for required key value pairs
   * @param {object[]} errors - An initially null array of errors that can be added as configuration is processed
   * @param {object} finalConfig - A object in which to store the retrieved configuration
   */ 
  function processKeyValuesPairsInEnv(configRequest, errors, finalConfig) {
    //setup nconf for reading environment and startup args
    var requestedKeys = configRequest.keys,
        prefix, 
        requestedProp,
        requestedPtr,
        ptr,
        envVal;
    if (configRequest.name) {
      prefix = configRequest.name.toUpperCase();
    } else {
      prefix = '';
    }
    if (requestedKeys) {
      for (requestedPtr in requestedKeys) {
        requestedProp = requestedKeys[requestedPtr].replace('/', '_').replace('#', '').toUpperCase();
        envVal = process.env[prefix.concat(requestedProp)];
        if (envVal !== undefined) {
          ptr = jptr.create(requestedKeys[requestedPtr]);
          ptr.set(finalConfig, envVal);
        }
      }
    }
    ee.emit('env-config-done', configRequest, errors, finalConfig);
  }
  
  function dnsConfigDone(err, config) {
    var serviceName;
    if (!err) {
      for (serviceName in config) {
        finalConfig[serviceName] = config[serviceName];
      }
    }
    ee.emit('srv-config-done', configRequest, finalConfig);
  } 
  
  /**
  * Handles the retrieval of KV pairs based on DNS SRV requests
  * @param {object} configRequest - A client provided object that may have a services section
  * @param {object[]} errors - An initially null array of errors that can be added as configuration is processed
  * @param {object} finalConfig - A object in which to store the retrieved configuration
  */   
  function processServicesInDNS(configRequest, errors, finalConfig) {
    assert.optionalArrayOfObject(configRequest.services, 'configRequest.services');
    if (configRequest.services !== undefined) {
      resolveSrv(configRequest, dnsConfigDone);
    } else {
      ee.emit('srv-config-done', configRequest, errors, finalConfig);
    }

  }
  
  /**
   * Finish processing wraps up configuration processing and determines if required parameters were met
   * @param {object} configRequest - A client provided object that determines the configuration to request
   * @param {object[]} errors - An initially null array of errors that can be added as configuration is processed
   * @param {object} finalConfig - The output configuration object
   */
  function finishProcessing(configRequest, errors, finalConfig) {
    var key,
        ptr,
        errors = null;
    if (configRequest.keys) {
      for (key in configRequest.keys) {
        ptr = jptr.create(configRequest.keys[key]);
        if (ptr.get(finalConfig) === undefined) {
          if (errors === null) {
            errors = [];
          }
          errors.push(new Error('Missing key value specified by ' + configRequest.keys[key])); 
        }
      }
    }
    ee.emit('config-validation-done', errors, finalConfig);
  }
  
  //event handlers - these determine the order in which configuration sources are processed
  ee.on('consul-config-done', processKeyValuesPairsInEnv);
  ee.on('env-config-done', processServicesInDNS);
  ee.on('srv-config-done', finishProcessing);
  
  //Client facing code
  
  /**
   * @callback doneCallback
   * @param {object[]} err - An array of configuration errors, if not null then at least one configuration values failed to be retrieved
   * @param {object} config - The finished configuration object
   */
  
  /**
   * Allows a client to request configuration
   * @name module:lib#getConfiguration
   * @param {object} config - A env-configurator config object that determines what properties will be looked up
   * @param {doneCallback} callback - A callback function to notify the client of the library with the new configuration object
   */
  function getConfiguration(config, callback) {
    assert.func(callback, 'callback');
    assert.object(config, 'config');
    var finalConfig = {};
    var consulClient = setupConsul(config);
    ee.once('config-validation-done', callback);
    processKeyValuePairsInConsul(config, consulClient, null, finalConfig);
  }
  
  return getConfiguration;
})();