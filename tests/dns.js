'use strict';
/*jshint -W097*/
/*global it: false, describe: false*/
var expect = require('expect')
  , sandboxedModule = require('sandboxed-module')
  , AssertionError = require('assert').AssertionError;
var getConfig = sandboxedModule.require('../lib/dns.js', {
  requires: { 'dns': {
      _validResults: [{ 'priority': 10, 'weight': 9, 'port': 27017, 'name': 'bar.example.com' },
            { 'priority': 10, 'weight': 5, 'port': 553, 'name': 'bar.example.com' },
            { 'priority': 20, 'weight': 5, 'port': 553, 'name': 'baz.example.com' }],
        resolveSrv: function (hostname, callback) {
          if (hostname === 'bar.services.local') {
            callback(null, this._validResults);
        } else {
          callback(new Error('Test'));
        }
        }
    }}
});

describe('dns-configurator', function () {
  
  it('should throw an error is not passed a call back function', function () {
    try {
      getConfig({}, {}, 'foo');
      throw new Error('Should have thrown error');
    } catch (err) {
      expect(err instanceof AssertionError).toBe(true);
    }
    try {
      getConfig({}, {}, undefined);
      throw new Error('Should have thrown error');
    } catch (err) {
      expect(err instanceof AssertionError).toBe(true);
    }
  });

  it('should do nothing when given an empty configuration object', function (done) {
    getConfig({}, {}, function (err, config) {
      expect(config['bar.services.local']).toNotExist('Config result should be an empty object');
      expect(config['foo.services.local']).toNotExist('Config result should be an empty object');
      done();
    });
  });

  it('should not define configuration results for services for which no DNS SRV records were returned', function (done) {
    getConfig({
      'services': [
        {
          'name': 'foo',
          'key': '#/foo',
          'formatter': 'http'
        }
      ]
    }, {}, function (err, config) {
      expect(config.foo).toNotExist('Config result should not contain names for which there was no result');
      done();
    });
  });

  it('should process a valid response from a SRV record lookup', function (done) {
    getConfig({
      'services': [
        {
          'name': 'bar.services.local',
          'key': '#/bar/uri',
          'formatter': 'http'
        }
      ]
    }, {}, function (err, config) {
      expect(config['bar.services.local']).toExist("Config should have configuration property");
      expect(config['bar.services.local'].key).toBe('#/bar/uri');
      expect(config['bar.services.local'].value).toBe('http://bar.example.com:27017/');
      done();
    });
  });
  
  it('should process a valid response from a SRV record lookup and apply post/pre-fixs', function (done) {
    getConfig({
      'services': [
        {
          'name': 'bar.services.local',
          'key': '#/bar/uri',
          'formatter': 'http',
          'prefix': '#/bar/env',
          'suffix': '#/bar/dbname'
        }
      ]
    }, {
      'bar': {
        'env': 'dev.',
        'dbname': 'default'
      }
    }, function (err, config) {
      expect(config['bar.services.local']).toExist("Config should have configuration property");
      expect(config['bar.services.local'].value).toBe('http://dev.bar.example.com:27017/default');
      expect(config['bar.services.local'].key).toBe('#/bar/uri');
      done();
    });
  });

  it('should process a valid response from a SRV record lookup and gracefully return a url in case of suffix retrieval error', function (done) {
    getConfig({
      'services': [
        {
          'name': 'bar.services.local',
          'key': '#/bar/uri',
          'formatter': 'http',
          'prefix': '#/bar/env',
          'suffix': '#/bar/dbname'
        }
      ]
    }, {
      'bar': {
        'env': 'dev.',
      }
    }, function (err, config) {
      expect(config['bar.services.local']).toExist("Config should have configuration property");
      expect(config['bar.services.local'].value).toBe('http://dev.bar.example.com:27017/');
      expect(config['bar.services.local'].key).toBe('#/bar/uri');
      done();
    });
  });

  it('should fall back to pre-configured values from other providers if DNS configuration fails', function (done) {
    getConfig({
      'services': [
        {
          'name': 'not.provided.local',
          'key': '#/bar/uri',
          'formatter': 'http',
          'suffix': '#/bar/name'
        }
      ]
    }, {
      'bar': {
        'uri': 'http://backup.example.com/',
        'name': 'hello'
      }
    }, function (err, config) {
      expect(config['not.provided.local']).toExist();
      expect(config['not.provided.local'].value).toBe('http://backup.example.com/hello');
      done();
    });
  });

  it('should handle fall back values which are missing trailing slashes, env-configurator issue #7 ', function (done) {
    getConfig({
      'services': [
        {
          'name': 'not.provided.local',
          'key': '#/bar/uri',
          'formatter': 'http',
          'suffix': '#/bar/name'
        },
        {
          'name': 'other.provided.local',
          'key': '#/baz/uri',
          'formatter': 'http',
          'suffix': '#/baz/name'
        },
        {
          'name': 'complete.provided.local',
          'key': '#/foo/uri',
          'formatter': 'http'
        }
      ]
    }, {
      'bar': {
        'uri': 'http://backup.example.com',
        'name': 'hello'
      },
      'baz': {
        'uri':  'http://backup.example.com',
        'name': '/hello'
      },
      'foo': {
        'uri': 'http://backup3.example.com'
      }
    }, function (err, config) {
      expect(config['not.provided.local']).toExist();
      expect(config['not.provided.local'].value).toBe('http://backup.example.com/hello');
      expect(config['other.provided.local']).toExist();
      expect(config['other.provided.local'].value).toBe('http://backup.example.com/hello');
      expect(config['complete.provided.local'].value).toExist();
      expect(config['complete.provided.local'].value).toBe('http://backup3.example.com');
      done();
    });
  });
});
