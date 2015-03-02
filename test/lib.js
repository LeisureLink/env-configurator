'use strict';
var expect = require('expect'),
    underTest = require('../lib/index.js'),
    AssertionError = require('assert').AssertionError,
    assert = require('assert');

describe('env-configurator lib', function() {
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
})
