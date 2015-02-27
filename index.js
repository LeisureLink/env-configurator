var getConfig = require('./lib');
/**
 * Exports the components from the env-configurator library
 * @param {object} callback - A callback function provided by the application in case it wants notification of when configuration is complete
 * and the configuration data
 * @module env-configurator
 */
module.exports = (function () {
  'use strict';
  var jayschema = require('jayschema'),
      schema = require('./lib/configuration-schema.json'),
      jptr = require('json-ptr'),
      assert = require('assert-plus');
  
  function configurator() {
    var appConfiguration = {},
        appConfigSpecs = {};
  };

  function validateClientConfig(configSpec, done) {
    jayschema.validate(configSpec, this.schema, done);
  }

  function renew(context) {
    //no-op
  }

  function renewAll() {
    //no-op
  }
  
  /**
   * Returns a configuration property from a particular configuration context as identified by a JSON-ptr
   * @name module:env-configurator#configurator#get
   * @param {string} context - The configurator context, this name corresponds to the configuration spec name
   * @param {string} ptr - A @{link http://tools.ietf.org/html/rfc6901|JSON ptr} string to the value the client needs
   * @returns The requested value or undefined
   */
  Object.defineProperty(configurator.prototype, 'get', {
    value: function get(context, ptr) {
      assert.string(context, 'context');
      assert.string(ptr, 'ptr');
      var ptr = jptr.create(ptr);
      return ptr.get(appConfiguration[context]);
    }
  });
  
  /**
   * configFulfilled notifies the config library client of when the configuration is complete
   * 
   * @callback configFulfilled
   * @param {object} err - An error object returned if an error occurred, if err = false then config retrival for the given spec was successful
   */

  /**
   * Attempts to fulfill a client's configuration specification by retrieve configuration from various sources and making it
   * available via the get method
   * @name module:env-configurator#configurator#fulfill
   * @param {object} configSpec - A config object described by the @{link file://lib/configuration-schema.json|the configurator's JSON schema}
   * @param {configFulfilled} [configFulfilled] - An optional callback function that will be called when successful configuration is complete or when an error is encountered
   */
  Object.defineProperty(configurator.prototype, 'fulfill', {
    value: function fulfill(configSpec, configFulfilled) {
      assert.optionalFunc(configFulfilled, 'configFulfilled');
      validateClientConfig(configSpec, function (err) {
        if (!err) {
          appConfigSpecs[configSpec.name] = configSpec;
          if (!(configSpec.name in appConfiguration)) {
            appConfiguration[configSpec.name] = {};
          }
        }
      })
    }
  });

  return configurator;

})();