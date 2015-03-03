var resolveSrv = require('./dns.js'),
    EventEmitter = require('events').EventEmitter,
    jptr = require('json-ptr'),
    assert = require('assert-plus');
/**
* Attempts to provide a configuration based on a required configuration input
* @module lib
*/
module.exports = (function () {
  'use strict';
  
  var CONSUL_HOST = 'CONSUL_HOST',
      CONSUL_PORT = 'CONSUL_PORT',
      CONSUL_SECURE = 'CONSUL_SECURE',
      ee = new EventEmitter(),
      matchSlashGreedy = new RegExp('/', 'g');
  
  /**
   * Does Service Have Ptr checks to see if a value **bound** to this is present in 
   * any of the three fields used to define a JSON Ptr in a service spec
   * 
   * This function can be used on its own, but it is intended to be used with the Array.some(...) function
   * 
   * @param {object} val - An object, generally expected to be a service specification from configuration-schema.json
   * @returns {boolean} True or false based on whether the bound name 'this' was present in any of the JSON Ptr fields
   */
  function doesServiceHavePtr(val) {
    return val.key === this || val.prefix === this || val.suffix === this;
  }

  /**
   * Match and set env var looks for an environment variable given an name prefix and a JSON ptr
   * @param {object} finalConfig - The object to store the value of the env var in if found
   * @param {string} prefix - A prefix to apply to names being looked for in the environment
   * @param {object} ptr - A JSON ptr object
   */ 
  function matchAndSetEnvVar(finalConfig, prefix, ptr) {
    var requestedProp,
        envVal;
    requestedProp = ptr.pointer.replace(matchSlashGreedy, '_').toUpperCase();
    envVal = process.env[prefix.concat(requestedProp)];
    if (envVal !== undefined) {
      ensureObjPath(finalConfig, ptr);
      ptr.set(finalConfig, envVal);
    }
  }
  
  /**
   * Ensure object path is a small utility function for use with JSON pointers that ensures a particular pointer path
   * exists in an object. The function is non-destructive and only creates a path component as necessary.
   * @param {object} object - A JSON object to ensure that a particular pointer path exists in
   * @param {object} ptr - A {@link https://github.com/flitbit/json-ptr|JSON pointer object}
   */
  function ensureObjPath(object, ptr) {
    var cursor = object,
        currentName,
        idx,
        pathAry = ptr.path;
    for (idx = 0; idx < pathAry.length; idx++) {
      currentName = pathAry[idx];
      if (!cursor[currentName]) {
        cursor[currentName] = {};
      }
      cursor = cursor[currentName];
    }

  }
  
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
        requestedServices = configRequest.services,
        requestedKey,
        pathPrefixIdx,
        idx,
        resultPtr;
    if (consulClient !== undefined && (requestedKeys || requestedServices)) {
      requestedKeys = requestedKeys || [];
      requestedServices = requestedServices || [];
      consulClient.kv.get({
        key: configRequest.name + '/',
        recurse: true
      }, function (err, result) {
        var foundKeyIdx,
            hasService,
            pathPtr;
        if (err) {
          if (errors === null) {
            errors = null;
          }
          errors.push(err);
        } else {
          //MSH 2015-03-03 The following loop & block deserve some explanation. The goal
          //is to take keys returned from Consul and set config values for services & keys
          //services is, unfortunately, an array of objects with *3* properties that may need
          //to be fulfilled (key, prefix, and suffix). 
          for (idx = 0; idx < result.length; idx++) {
            pathPrefixIdx = result[idx].Key.indexOf(configRequest.name);
            pathPtr = '#' + result[idx].Key.slice(pathPrefixIdx + configRequest.name.length);
            foundKeyIdx = requestedKeys.indexOf(pathPtr);
            resultPtr = jptr.create(pathPtr);
            if (foundKeyIdx !== -1) {
              ensureObjPath(finalConfig, resultPtr);
              resultPtr.set(finalConfig, result[idx].Value);
            } else {
              hasService = requestedServices.some(doesServiceHavePtr, pathPtr);
              if (hasService) {
                ensureObjPath(finalConfig, resultPtr);
                resultPtr.set(finalConfig, result[idx].Value);
              }
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
    var requestedKeys = configRequest.keys,
        requestedServices = configRequest.services,
        prefix, 
        ptr,
        idx;
    if (configRequest.name) {
      prefix = configRequest.name.toUpperCase();
    } else {
      prefix = '';
    }
    if (requestedKeys) {
      for (idx = 0; idx < requestedKeys.length; idx++) {
        ptr = jptr.create(requestedKeys[idx]);
        matchAndSetEnvVar(finalConfig, prefix, ptr); 
      }
    }
    if (requestedServices) {
      for (idx = 0; idx < requestedServices.length; idx++) {
        ptr = jptr.create(requestedServices[idx].key);
        matchAndSetEnvVar(finalConfig, prefix, ptr);
        if (requestedServices[idx].prefix) {
          ptr = jptr.create(requestedServices[idx].prefix);
          matchAndSetEnvVar(finalConfig, prefix, ptr);
        }
        if (requestedServices[idx].suffix) {
          ptr = jptr.create(requestedServices[idx].suffix);
          matchAndSetEnvVar(finalConfig, prefix, ptr);
        }
      }
    }
    ee.emit('env-config-done', configRequest, errors, finalConfig);
  }
  
  /**
  * Handles the retrieval of KV pairs based on DNS SRV requests
  * @param {object} configRequest - A client provided object that may have a services section
  * @param {object[]} errors - An initially null array of errors that can be added as configuration is processed
  * @param {object} finalConfig - A object in which to store the retrieved configuration
  */   
  function processServicesInDNS(configRequest, errors, finalConfig) {
    function dnsConfigDone(err, config) {
      var serviceName,
          ptr;
      if (!err) {
        for (serviceName in config) {
          ptr = jptr.create(config[serviceName].key);
          ensureObjPath(finalConfig, ptr);
          ptr.set(finalConfig, config[serviceName].value);
        }
      }
      ee.emit('srv-config-done', configRequest, errors, finalConfig);
    }
    assert.optionalArrayOfObject(configRequest.services, 'configRequest.services');
    if (configRequest.services !== undefined) {
      resolveSrv(configRequest, finalConfig, dnsConfigDone);
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
    var ptr,
        idx;
    if (configRequest.keys) {
      for (idx = 0; idx < configRequest.keys.length; idx++) {
        ptr = jptr.create(configRequest.keys[idx]);
        if (ptr.get(finalConfig) === undefined) {
          if (errors === null) {
            errors = [];
          }
          errors.push(new Error('Missing key value specified by ' + configRequest.keys[idx])); 
        }
      }
    }
    if (configRequest.services) {
      for (idx = 0; idx < configRequest.services.length; idx++) {
        ptr = jptr.create(configRequest.services[idx].key);
        if (ptr.get(finalConfig) === undefined) {
          if (errors === null) {
            errors = [];
          }
          errors.push(new Error('Missing service key value specified by service with name ' + configRequest.services[idx].name));
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
   * @name module:lib
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