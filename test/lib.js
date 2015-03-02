'use strict';
/*jshint -W097*/
/*global it: false, describe: false*/
var expect = require('expect'),
    sandboxedModule = require('sandboxed-module'),
    underTest = sandboxedModule.require('../lib/index.js', {
      'requires' : {
        './dns.js': function (config, cb) {
          var result = {};
          if (config.name) {
            result[config.name] = 'https://foo.example.com/bar';
            cb(null, result);
          } else {
            cb(new AssertionError('test'), null);
          }
        },
        'consul': function consulClient(options) {
          return {
            'kv': {
              'get': function (options, cb) {
                cb(null, [
                  {
                    "CreateIndex": 100,
                    "ModifyIndex": 200,
                    "LockIndex": 200,
                    "Key": options.key + "foo",
                    "Flags": 0,
                    "Value": "dGVzdA==",
                    "Session": "adf4238a-882b-9ddc-4a9d-5b6758e4159e"
                  },
                  {
                    "CreateIndex": 100,
                    "ModifyIndex": 200,
                    "LockIndex": 200,
                    "Key": options.key + "bar",
                    "Flags": 0,
                    "Value": "dGVzdA==asd",
                    "Session": "adf4238a-882b-9ddc-4a9d-5b6758e4159e"
                  }
                ]);
              }
            }
          }
        }
      }
    }),
    AssertionError = require('assert').AssertionError,
    assert = require('assert');

describe('env-configurator lib', function () {
  it('should throw an error if given an undefined config object or config was not an object', function () {
    try {
      underTest(undefined, function () { });
      throw new Error("Should not have passed error catch blocks");
    } catch (err) {
      expect(err instanceof AssertionError).toBe(true);
    }
    try {
      underTest('foo', function () { });
      throw new Error("Should not have passed error catch blocks");
    } catch (err) {
      expect(err instanceof AssertionError).toBe(true);
    }
  });
  
  it('should throw an error if given an undefined callback function', function () {
    try {
      underTest({}, null);
      throw new Error("Should not have passed error catch blocks");
    } catch (err) {
      expect(err instanceof AssertionError).toBe(true);
    }
    try {
      underTest({}, 'foo');
      throw new Error("Should not have passed error catch blocks");
    } catch (err) {
      expect(err instanceof AssertionError).toBe(true);
    }
  });
  
  it('should gracefully do nothing if given an empty config', function () {
    underTest({}, function (err, config) {
      expect(config).toNotBe(null);
    });
  });
  
  it('should return errors when requested config keys are not fulfilled', function () {
    underTest({
      name: 'TEST',
      keys: [
        '#/me'
      ]
    }, function (err, config) {
      expect(err).toNotBe(null);
    
    });
  });
  
  it('should correctly retrieve a single variable from the environment', function () {
    process.env['TEST_ME'] = 'foobar';
    underTest({
      name: 'TEST',
      keys: [
        '#/me'
      ]
    }, function (err, config) {
      expect(err).toBe(null);
      expect(config).toNotBe(null);
      expect(config.me).toBe('foobar');
    });
  });
  
  it('should correctly retrieve a single variable from consul', function () {
    process.env['CONSUL_HOST'] = 'localhost';
    process.env['CONSUL_PORT'] = '234';
    process.env['CONSUL_SECURE'] = true;
    
    underTest({
      name: 'TEST',
      keys: [
        '#/foo'
      ]
    }, function (err, config) {
      expect(err).toBe(null);
      expect(config).toNotBe(null);
      expect(config.foo).toBe('dGVzdA==');
      expect(config.bar).toBe(undefined);
    });
  });
});
