'use strict';
var JaySchema = require('jayschema'),
    jaySchema = new JaySchema(),
    schema = require('./lib/configuration-schema.json'),
    jptr = require('json-ptr'),
    assert = require('assert-plus'),
    getConfig = require('./lib/index.js'),
    async = require('async'),
    appConfiguration = {},
    appConfigSpecs = {},
    looksLikeJSONPtr = new RegExp('^[#/]');
/**
 * @module env-configurator
 */
module.exports = Configurator;

function validateClientConfig(configSpec, done) {
  jaySchema.validate(configSpec, schema, done);
}

/**
 * Creates a configurator object
 * @constructor
 */
function Configurator() { }


/**
 * Refreshes a specific configuration by config spec name from all valid configuration sources
 * @name module:env-configurator~Configurator#renew
 * @kind function
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
 * @name module:env-configurator~Configurator#renewAll
 * @kind function
 * @param {configFulFilled} [configFulfilled] - An optional callback function that notifies the client when configuration work is complete
 */
Object.defineProperty(Configurator.prototype, 'renewAll', {
  value: function renewAll(configFulfilled) {
    assert.optionalFunc(configFulfilled, 'configFulfilled');
    var propName,
        taskList = [];
    for (propName in appConfigSpecs) {
      if (appConfigSpecs.hasOwnProperty(propName)) {
        taskList.push(makeRenewTask(appConfigSpecs[propName]));
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

function makeRenewTask(configSpec) {
  return function task(cb) {
    getConfig(configSpec, function (err, config) {
      if (!err) {
        cb(null, { name: configSpec.name, value: config });
      } else {
        cb(err);
      }
    });
  };
}

/**
 * Returns a configuration property from a particular configuration context as identified by a JSON-ptr
 * @name module:env-configurator~Configurator#get
 * @kind function
 * @param {string} context - The configurator context, this name corresponds to the configuration spec name or a JSON ptr with the full config path
 * including the context name as the first component
 * @param {string} [ptrStr] - A @{link http://tools.ietf.org/html/rfc6901|JSON ptr} string to the value the client needs, if this parameter is missing it
 * is assumed that the first param to the function is a valid {@link https://github.com/flitbit/json-ptr|json-ptr} object
 * @returns The requested value or undefined
 * @throws {Error} Throws an error if the given arguments are invalid or if the arguments were valid but reference an undefined key which was not explicitly marked
 * as optional
 */
Object.defineProperty(Configurator.prototype, 'get', {
  value: function get(context, ptrStr) {
    assert.string(context, 'context');
    assert.optionalString(ptrStr, 'ptrStr');
    var ptr,
        retVal,
        useFullPathPointer = false;
    if (ptrStr) {
      ptr = jptr.create(ptrStr);
      retVal = ptr.get(appConfiguration[context]);
    } else if (looksLikeJSONPtr.test(context)) {
      retVal = jptr.create(context).get(appConfiguration);
      useFullPathPointer = true;
    } else {
      throw new Error('Given context "'.concat(context, '" and ptr "', ptrStr, '" that cannot be used'));
    }
    //check for missing keys or namespaces and throw Error if needed
    if (retVal === undefined && !useFullPathPointer) {
      if (!appConfigSpecs[context] || !appConfigSpecs[context].optional || appConfigSpecs[context].optional.indexOf(ptrStr) === -1) {
        throw new Error('Given context "'.concat(context, '" and ptr "', ptrStr, '" that were not marked as optional'));
      }
    } else if (retVal === undefined) {
      //if we get here then the passed 'context' was a valid json pointer
      var idxOfSecondSlash = context.indexOf('/', 2);
      var firstComponent = context.substring(0, idxOfSecondSlash);
      var appSpec = jptr.create(firstComponent).get(appConfigSpecs);
      var keyName = '#' + context.substring(idxOfSecondSlash);
      if (!appSpec || !appSpec.optional || appSpec.optional.indexOf(keyName) === -1) {
        throw new Error('Given context "'.concat(context, '" and ptr "', ptrStr, '" that were not marked as optional'));
      }
    }
    return retVal;
  }
});

/**
 * configFulfilled notifies the config library client of when the configuration is complete
 * 
 * @callback configFulfilled
 * @param {object[]} err - An error object returned if an error occurred, if err = false then config retrival for the given spec was successful
 */

/**
 * Attempts to fulfill a client's configuration specification by retrieve configuration from various sources and making it
 * available via the get method. Note that only the first of multiple calls to this method with a configuration spec will be
 * acted on, calls after the first will be ignored. To update an existing configuration call renewAll or renew('name'). Fulfill may be
 * called with an array of configuration specs to fulfill please note though that if any config spec results in an error then the config
 * process will stop and return an error.
 * @name module:env-configurator~Configurator#fulfill
 * @kind function
 * @param {object|object[]} configSpec - A config object or array of config objects described by the @{link file://lib/configuration-schema.json|the configurator's JSON schema}
 * @param {configFulfilled} [configFulfilled] - An optional callback function that will be called when successful configuration is complete or when an error is encountered
 */
Object.defineProperty(Configurator.prototype, 'fulfill', {
  value: function fulfill(configSpec, configFulfilled) {
    assert.ok(configSpec);
    assert.optionalFunc(configFulfilled, 'configFulfilled');
    var idx,
        tasks = [];
    if (configSpec instanceof Array) {
      for (idx = 0; idx < configSpec.length; idx++) {
        tasks.push(getFulfillmentTask(configSpec[idx]));
      }
      async.parallel(tasks, configFulfilled);
    } else {
      getFulfillmentTask(configSpec)(configFulfilled);
    }
  }
});

function getFulfillmentTask(configSpec) {
  return function task(cb) {
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
            if (cb) {
              cb(err);
            }
          });
        } else {
          //for now we don't report being called with the same spec as an error
          cb(null);
        }
      } else {
        if (cb) {
          cb(err);
        }
      }
    });
  };
}