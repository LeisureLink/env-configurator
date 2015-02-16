'use strict';
var expect = require('expect')
  , sandboxedModule = require('sandboxed-module');
var getConfig = sandboxedModule.require('../lib/index.js', {
  requires: { 'dns': {
        _validResults: [{ 'priority': 10, 'weight': 5, 'port': 27017, 'name': 'foo.example.com' },
          { 'priority': 20, 'weight': 5, 'port': 27017, 'name': 'bar.example.com' }],
        resolveSrv: function (hostname, callback) {
          if (hostname === 'bar.services.local') {
            callback(null, this._validResults);
          }
        }
    }}
});

describe('dns-configurator', function () {
  it('should do nothing when given an empty configuration object', function () {
    getConfig({}, function (config) {
      expect(config['bar.services.local']).toNotExist('Config result should be an empty object');
      expect(config['foo.services.local']).toNotExist('Config result should be an empty object');
    });
  });

  it('should not define configuration results for services for which no DNS SRV records were returned', function () {
    getConfig({
      'services': [
        {
          'name': 'foo',
          'formatter': 'http'
        }
      ]
    }, function (config) {
      expect(config['foo']).toNotExist('Config result should not contain names for which there was no result');
    });
  });

  it('should process a valid response from a SRV record lookup', function () {
    getConfig({
      'services': [
        {
          'name': 'bar.services.local',
          'formatter': 'http'
        }
      ]
    }, function (config) {
      expect(config['bar.services.local']).toExist("Config should have configuration property");
      expect(config['bar.services.local']).toBe('http://bar.example.com:27017/');
    });
  });
});
