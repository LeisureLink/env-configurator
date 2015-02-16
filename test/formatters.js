'use strict';
var expect = require('expect')
  , sinon = require('sinon')
  , underTest = require('../lib/formatters.js');

describe('dns configurator formatters', function() {
  var addresses = [{ 'priority': 10, 'weight': 5, 'port': 27017, 'name': 'foo.example.com' },
    { 'priority': 10, 'weight': 5, 'port': 27017, 'name': 'bar.example.com' }];

  it('should format a mongodb driver URL without a database name and use the top ranked address', function () {
    var result = underTest.mongodb(addresses);
    expect(result).toBe('mongodb://foo.example.com:27017/');
  });

  it('should format a HTTP url using the top ranked result', function () {
    var result = underTest.http(addresses);
    expect(result).toBe('http://foo.example.com:27017/');
  });

  it('should format a HTTPS url using the top ranked result', function () {
    var result = underTest.https(addresses);
    expect(result).toBe('https://foo.example.com:27017/');
  });

  it('should format a name using the top ranked result', function () {
    var result = underTest.bareName(addresses);
    expect(result).toBe('foo.example.com');
  });
})
