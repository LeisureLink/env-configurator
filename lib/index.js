var resolveSrv = require('./dns.js'),
    nconf = require('nconf'),
    ee = require('events').EventEmitter;
/**
* Attempts to provide a configuration based on a required configuration input
* @module lib
* @param {object} config - Specifies the services and key-value pairs to look up 
* @param {object} callback - A callback function to call when configuration is complete (or failed)
*/
module.exports = (function() {
  'use strict';
  
  var configurer = {};
  
  /**
   * Determines if we should use a consul agent to add configuration
   * @param {object} configurationRequest - A configuration request object that may contain information required to contact a consul agent
   * @returns {object} A reference to an active consule agent if one could be configured, undefined otherwise
   */
  function setupConsul(configRequest) {
    //client must fully specify how we will talk to consul
    var consulClient = undefined;
    if (configRequest.consulAgent
      && configRequest.consulAgent.host
      && configRequest.consulAgent.port
      && configRequest.consulAgent.secure) {
      consulClient = require('consul')({
        host: configRequest.consulAgent.host,
        port: configRequest.consulAgent.port,
        secure: configRequest.consulAgent.secure
      });
    }
    return consulClient;
  }  
  
  /**
   * Determines if the given client config contains a valid key-value pair request
   * @param {object} configRequest - A client provided object that may have a key value section for require key value pairs
   * @returns {boolean} True if there was a keyValues section and it was valid, false if there was no section to be processed
   */ 
  function validateKeyValueSection(configRequest) {
    if (configRequest.keyValues) {
      assert.object(config.keyValues, 'config.keyValues');
      assert.string(config.keyValues.prefix, 'config.keyValues.prefix');
      assert.arrayOfObject(config.keyValues.keys, 'config.keyValues.keys');
      return true;
    } else {
      return false;
    }
  }
  
  function processKeyValuePairsInConsul(configRequest, consulClient, finalConfig) {
    finalConfig.keys = [];
    if (consulClient !== undefined) {
      consulClient.kv.key({
        key: configRequest.keyValues.prefix + '/',
        recurse: true
      }, function (err, result) {
        if (err) {
          throw err;
        } else {
          for (var i = 0; i < result.length; i++) {
            var lastSlash = result[i].Key.lastIndexOf('/');
            if (result[i].substring(lastSlash + 1) ) 
          }
        }
      });
    } else {
      ee.emit('consul-config-done', configRequest, finalConfig);
    }
  }
  
  function processKeyValuesPairsInEnv(configRequest, finalConfig) {
    //setup nconf for reading environment and startup args
    nconf.env({
      separator: '_',
      match: new RegExp('^' + config.keyValues.prefix, 'i')
    });
  }
  
  function finishProcessing(configRequest, finalConfig) {

  }

  //event handlers
  ee.on('consul-config-done', processKeyValuesPairsInEnv);
  ee.on('env-config-done', processServicesInDNS);
  ee.on('srv-config-done', finishProcessing);
  
  //Client facing code
  
  /**
   * Allows a client to request configuration
   * @name module:lib#getConfiguration
   * @param {object} config - A env-configurator config object that determines what properties will be looked up
   * @param {object} callback - A callback function to notify the client of the library with the new configuration object
   */
  Object.defineProperty(configurer, 'getConfiguration', {
    value: function getConfiguration(config, callback) {
      assert.func(callback, 'callback');
      assert.object(config, 'config');
      var finalConfig = {};

      callback(finalConfig);
    }
  });

  return configurer;
})();