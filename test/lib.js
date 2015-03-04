'use strict';
/*jshint -W097*/
/*global it: false, describe: false*/
var expect = require('expect'),
    sandboxedModule = require('sandboxed-module'),
    underTest = sandboxedModule.require('../lib/index.js', {
      'requires' : {
        'dns': {
          _validResults: [{ 'priority': 10, 'weight': 9, 'port': 443, 'name': 'foo.example.com' },
            { 'priority': 10, 'weight': 5, 'port': 553, 'name': 'bar.example.com' },
            { 'priority': 20, 'weight': 5, 'port': 553, 'name': 'baz.example.com' }],
          resolveSrv: function (hostname, callback) {
            if (hostname === 'foo.service.consul') {
              callback(null, this._validResults);
            } else {
              callback(new Error('TEST'));
            }
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
          };
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
    process.env.TEST_ME = 'foobar';
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
  
  it('should correctly retrieve multiple multi-leveled variables from the environment', function () {
    process.env.TEST_ME = 'foobar';
    process.env.TEST_BAR_BAZ = 'foobar';
    underTest({
      name: 'TEST',
      keys: [
        '#/me',
        '#/bar/baz'
      ]
    }, function (err, config) {
      expect(err).toBe(null);
      expect(config).toNotBe(null);
      expect(config.me).toBe('foobar');
      expect(config.bar).toExist();
      expect(config.bar.baz).toBe('foobar');
    });
  });
  
  it('should correctly retrieve a single variable from consul', function () {
    process.env.CONSUL_HOST = 'localhost';
    process.env.CONSUL_PORT = '234';
    process.env.CONSUL_SECURE = true;
    
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
  
  it('should allow the env configuration provider to override the consul config provider for KV pairs', function () {
    process.env.CONSUL_HOST = 'localhost';
    process.env.CONSUL_PORT = '234';
    process.env.CONSUL_SECURE = true;
    process.env.TEST_FOO = 'foobar';
    
    underTest({
      name: 'TEST',
      keys: [
        '#/foo'
      ]
    }, function (err, config) {
      expect(err).toBe(null);
      expect(config).toNotBe(null);
      expect(config.foo).toBe('foobar');
      expect(config.bar).toBe(undefined);
    });
  });
  
  it('should retrieve service configuration from the DNS if so configured', function () {
    process.env.TEST_NAME = 'bar';
    underTest({
      name: 'TEST',
      services: [
        {
          name: 'foo.service.consul',
          key: '#/foo/uri',
          formatter: 'https',
          suffix: '#/name'
        }
      ]
    }, function (err, config) {
      expect(err).toBe(null);
      expect(config).toNotBe(null);
      expect(config.foo).toNotBe(null);
      expect(config.foo.uri).toBe('https://foo.example.com:443/bar');
    });
  });
  
  it('should retrieve service configuration from the DNS if so configured', function () {
    underTest({
      name: 'TEST',
      services: [
        {
          name: 'foo.service.consul',
          key: '#/foo/uri',
          formatter: 'https'
        }
      ]
    }, function (err, config) {
      expect(err).toBe(null);
      expect(config).toNotBe(null);
      expect(config.foo).toNotBe(null);
      expect(config.foo.uri).toBe('https://foo.example.com:443/bar');
    });
  });
  
  it('should allow the service configuration from DNS to override env configuration', function () {
    process.env.TEST_FOO_URI = 'should_not_be_returned';
    
    underTest({
      name: 'TEST',
      keys: [
            '#/foo/uri'
      ],
      services: [
        {
          name: 'foo.service.consul',
          key: '#/foo/uri',
          formatter: 'https'
        }
      ]
    }, function (err, config) {
      expect(err).toBe(null);
      expect(config).toNotBe(null);
      expect(config.foo).toNotBe(null);
      expect(config.foo.uri).toBe('https://foo.example.com:443/bar');
    });
  });
});
