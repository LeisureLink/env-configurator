'use strict';
/*jshint -W097*/
/*global it: false, describe: false*/
var expect = require('expect'),
    UnderTest = require('../index.js');

describe('env-configurator', function() {
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
})
