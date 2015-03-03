module.exports = (function () {
  'use strict';
  var JaySchema = require('jayschema'),
      jaySchema = new JaySchema(),
      schema = require('./lib/configuration-schema.json'),
      jptr = require('json-ptr'),
      assert = require('assert-plus'),
      getConfig = require('./lib/index.js'),
      async = require('async'),
      appConfiguration = {},
      appConfigSpecs = {};
  
  function validateClientConfig(configSpec, done) {
    jaySchema.validate(configSpec, schema, done);
  }
  
  /**
   * Creates a configurator object
   * @name module:env-configurator
   * @constructor
   */
  function Configurator() { }
  
  /**
   * Refreshes a specific configuration by config spec name from all valid configuration sources
   * @name module:env-configurator#renew
   * @param {string} context - The name of the config spec, specifically the 'name' property of the originally given configuration spec
   * @param {configFulFilled} [configFulfilled] - An optional callback function that notifies the client when configuration work is complete
   */
  Object.defineProperty(Configurator.prototype, 'renew', {
    value: function renew(context, configFulFilled) {
      assert.optionalFunc(configFulFilled, 'configFulfilled');
      if (appConfigSpecs[context]) {
        getConfig(appConfigSpecs[context], function (err, config) {
          if (!err) {
            appConfiguration[context] = config;
            if (configFulFilled) {
              configFulFilled(null);
            }
          } else {
            if (configFulFilled) {
              configFulFilled(err);
            }
          }
        });
      }
    }
  });

  
  /**
   * Refreshes the configurators existing configuration specs from all valid configuration sources
   * @name module:env-configurator#renewAll
   * @param {configFulFilled} [configFulfilled] - An optional callback function that notifies the client when configuration work is complete
   */
  Object.defineProperty(Configurator.prototype, 'renewAll', {
    value: function renewAll(configFulfilled) {
      assert.optionalFunc(configFulfilled, configFulfilled);
      var propName,
          taskList = [];
      function makeTask(configSpec) {
        return function (cb) {
          getConfig(configSpec, function (err, config) {
            if (!err) {
              cb(null, { name: configSpec.name, value: config });
            } else {
              cb(err);
            }
          });
        };
      }
      for (propName in appConfigSpecs) {
        if (appConfigSpecs.hasOwnProperty(propName)) {
          taskList.push(makeTask(appConfigSpecs[propName]));
        }
      }
      async.parallel(taskList, function (err, config) {
        var idx;
        if (!err) {
          for (idx = 0; idx < config.length; idx++) {
            appConfiguration[config[idx].name] = config[idx].value;
          } 
          configFulfilled(null);
        } else {
          configFulfilled(err);
        }
      });
    }
  });
  
  /**
   * Returns a configuration property from a particular configuration context as identified by a JSON-ptr
   * @name module:env-configurator#get
   * @param {string} context - The configurator context, this name corresponds to the configuration spec name
   * @param {string} ptrStr - A @{link http://tools.ietf.org/html/rfc6901|JSON ptr} string to the value the client needs
   * @returns The requested value or undefined
   */
  Object.defineProperty(Configurator.prototype, 'get', {
    value: function get(context, ptrStr) {
      assert.string(context, 'context');
      assert.string(ptrStr, 'ptrStr');
      var ptr = jptr.create(ptrStr);
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
   * available via the get method. Note that only the first of multiple calls to this method with a configuration spec will be
   * acted on, calls after the first will be ignored. To update an existing configuration call renewAll or renew('name')
   * @name module:env-configurator#fulfill
   * @param {object} configSpec - A config object described by the @{link file://lib/configuration-schema.json|the configurator's JSON schema}
   * @param {configFulfilled} [configFulfilled] - An optional callback function that will be called when successful configuration is complete or when an error is encountered
   */
  Object.defineProperty(Configurator.prototype, 'fulfill', {
    value: function fulfill(configSpec, configFulfilled) {
      assert.optionalFunc(configFulfilled, 'configFulfilled');
      validateClientConfig(configSpec, function (err) {
        if (!err) {
          if (!appConfigSpecs[configSpec.name]) {
            appConfigSpecs[configSpec.name] = configSpec;
            if (!(configSpec.name in appConfiguration)) {
              appConfiguration[configSpec.name] = {};
            }
            getConfig(configSpec, function (err, config) {
              if (!err) {
                appConfiguration[configSpec.name] = config;
              }
              if (configFulfilled) {
                configFulfilled(err);
              }
            });
          } else {
            //for now we don't report being called with the same spec as an error
            configFulfilled(null);
          }
        } else {
          if (configFulfilled) {
            configFulfilled(err);
          }
        }
      });
    }
  });
  
  return Configurator;

})();