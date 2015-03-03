'use strict';
/*jshint -W097*/
/*global it: false, describe: false*/
var expect = require('expect'),
    UnderTest = require('../index.js');

describe('env-configurator', function () {
  var underTest;
  it('should validate and reject poorly formed configuration requests', function () {
    underTest = new UnderTest();
    underTest.fulfill({}, function (errs) {
      expect(errs).toExist();
    });
  });
  
  it('should handle validation without a callback function', function () {
    underTest = new UnderTest();
    underTest.fulfill({});
  });
  
  it('should gracefully handle a valid but empty configuration', function () {
    underTest = new UnderTest();
    underTest.fulfill({
      "name": "test"
    }, function (errs) {
      expect(errs).toNotExist();
    });
  });

  it('should make keys from the environment available via the get call', function () {
    process.env.TEST3_FOO_BAZ = 'bar';
    underTest = new UnderTest();
    underTest.fulfill({
      "name": "test3",
      "keys": [
        "#/foo/baz"
      ]
    }, function (errs) {
      expect(errs).toNotExist();
      expect(underTest.get('test3', '#/foo/baz')).toBe('bar');
    });
  });

  it('should ensure that a config spec for a name cannot be changed after the first call', function () {
    process.env.TEST5_FOO_BAZ = 'bar';
    underTest = new UnderTest();
    
    underTest.fulfill({
      "name": "test5",

    }, function (errs) {
      expect(errs).toNotExist();
      underTest.fulfill({
        "name": "test5",
        "keys": [
          "#/foo/baz"
        ]
      }, function (errs) {
        expect(errs).toNotExist();
        expect(underTest.get('test5', '#/foo/baz')).toNotExist();
      });
    });
  });
});