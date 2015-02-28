var resolveSrv = require('./dns.js'),
    ee = require('events').EventEmitter,
    jptr = require('json-ptr');
/**
* Attempts to provide a configuration based on a required configuration input
* @module lib
* @param {object} config - Specifies the services and key-value pairs to look up 
* @param {object} callback - A callback function to call when configuration is complete (or failed)
*/
module.exports = (function() {
  'use strict';
  
  const CONSUL_HOST = 'CONSUL_HOST';
  const CONSUL_PORT = 'CONSUL_PORT';
  const CONSUL_SECURE = 'CONSUL_SECURE';
  
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
    var appName = configRequest.name.toUpperCase(),
        consulHost = process.env[appName.concat('_', CONSUL_HOST)],
        consulPort = process.env[appName.concat('_', CONSUL_PORT)],
        consulSecure = process.env[appName.concat('_', CONSUL_SECURE)];
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
   * @param {object} consulClient - A pre-configured client used to communicate with a consul agent, may be undefined to indicate that
   * we are not supposed to use consul
   * @param {object} finalConfig - A object in which to store the retrieved configuration
   */
  function processKeyValuePairsInConsul(configRequest, consulClient, finalConfig) {
    var requestedKeys = configRequest.keys,
        requestedKey,
        lastSlash,
        idx;
    if (consulClient !== undefined) {
      consulClient.kv.key({
        key: configRequest.keyValues.prefix + '/',
        recurse: true
      }, function (err, result) {
        if (err) {
          throw err;
        } else {
          for (idx = 0; idx < result.length; idx++) {
            lastSlash = result[idx].Key.lastIndexOf('/');
            if (result[i].substring(lastSlash + 1) in requestedKeys) {
              requestedKey = requestedKeys[result[i].substring(lastSlash + 1)];
              finalConfig.keys[requestedKey.name] = result[idx].Value;
            }
          }
        }
      });
    } 
    ee.emit('consul-config-done', configRequest, finalConfig);
  }

   /**
   * Handles the retrieval of KV pairs from the application's runtime environment
   * @param {object} configRequest - A client provided object that may have a key value section for required key value pairs
   * @param {object} finalConfig - A object in which to store the retrieved configuration
   */ 
  function processKeyValuesPairsInEnv(configRequest, finalConfig) {
    //setup nconf for reading environment and startup args
    var requestedKeys = configRequest.keys,
        prefix = configRequest.keyValues.prefix,
        requestedProp,
        envVal;
    for (requestedProp in requestedKeys) {
      envVal = process.env[prefix.concat('_', requestedProp)];
      if (envVal !== undefined) {
        finalConfig.keys[requestedProp.name] = envVal;
      }
    }
    ee.emit('env-config-done', configRequest, finalConfig);
  }

  /**
  * Handles the retrieval of KV pairs based on DNS SRV requests
  * @param {object} configRequest - A client provided object that may have a services section
  * @param {object} finalConfig - A object in which to store the retrieved configuration
  */   
  function processServicesInDNS(configRequest, finalConfig) {
    assert.optionalArrayOfObject(configRequest.services, 'configRequest.services');
    if (configRequest.services !== undefined) {
      function dnsConfigDone(err, config) {
        var serviceName;
        if (!err) {
          for (serviceName in config) {
            finalConfig.keys[serviceName] = config[serviceName];
          }
        }
        ee.emit('srv-config-done', configRequest, finalConfig);
      }
      resolveSrv(configRequest, dnsConfigDone);
    } else {
      ee.emit('srv-config-done', configRequest, finalConfig);
    }

  }
  
  /**
   * Finish processing wraps up configuration processing and determines if required parameters were met
   * @param {object} configRequest - A client provided object that determines the configuration to request
   * @param {object} finalConfig - The output configuration object
   */
  function finishProcessing(configRequest, finalConfig) {
    if (configRequest.keys) {
      for (let key in configRequest.keys) {
        var ptr = jptr.create(key);
        if (ptr.get(finalConfig) === undefined) {
          //make an error message
          console.log('Fatal: Missing config value specified by ' + key);
        }
      }
    }
    //TODO: Emit actual errors
    ee.emit('config-validation-done', [], finalConfig);

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
      finalConfig.keys = {};
    var consulClient = setupConsul(config);
    processKeyValuePairsInConsul(config, consulClient, finalConfig);
      ee.once('config-validation-done', callback);
    }

  return getConfiguration;
})();