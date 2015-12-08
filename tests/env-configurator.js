var expect = require('expect'),
    UnderTest = require('../index.js');

describe('env-configurator', function () {
  var underTest;
  it('should validate and reject poorly formed configuration requests', function (done) {
    underTest = new UnderTest();
    underTest.fulfill({}, function (errs) {
      expect(errs).toExist();
      done();
    });
  });

  it('should handle validation without a callback function', function () {
    underTest = new UnderTest();
    underTest.fulfill({});
  });

  describe('when #get is called', function () {
    var underTest;
    before('setup a basic config spec for testing #get', function (done) {
      process.env.TEST3_FOO_BAZ = 'bar';
      underTest = new UnderTest();
      underTest.fulfill({
        'name': 'test3',
        'keys': [
          '#/foo/baz'
        ],
        'optional': [
          '#/baz/foo'
        ]
      }, function (errs) {
        expect(errs).toNotExist();
        done();
      });
    });

    it('should throw an error when asked for configuration from a nonexistant context', function () {
      try {
        underTest.get('someNamespace', '#/my/ptr');
        throw new Error('Test failure--should not get here');
      } catch (expected) {
        expect(expected).toExist();
      }
    });

    it('should throw an error when given invalid parameters', function () {
      try {
        underTest.get('someNamespace');
        throw new Error('Test failure--should not get here');
      } catch (expected) {
        expect(expected).toExist();
      }
    });

    it('should make keys from the environment available via the get call', function () {
        expect(underTest.get('test3', '#/foo/baz')).toBe('bar');
    });

    it('should not throw an error on a json ptr referencing an optional key', function () {
      expect(underTest.get('#/test3/baz/foo')).toNotExist();
    });
    it('should not throw an error on a context and json ptr referencing an optional key', function () {
      expect(underTest.get('test3', '#/baz/foo')).toNotExist();
    });
  });

  it('should gracefully handle a valid but empty configuration', function (done) {
    underTest = new UnderTest();
    underTest.fulfill({
      'name': 'test'
    }, function (errs) {
      expect(errs).toNotExist();
      done();
    });
  });

  it('should ensure that a config spec for a name cannot be changed after the first call', function (done) {
    process.env.TEST5_FOO_BAZ = 'bar';
    underTest = new UnderTest();

    underTest.fulfill({
      'name': 'test5',

    }, function (errs) {
      expect(errs).toNotExist();
      underTest.fulfill({
        'name': 'test5',
        'keys': [
          '#/foo/baz'
        ]
      }, function (errs) {
        expect(errs).toNotExist();
        try {
          underTest.get('test5', '#/foo/baz');
        } catch (expected) {
          expect(expected).toExist();
        }
        done();
      });
    });
  });

  it('should renew an existing configuration if renew(name) is called', function (done) {
    process.env.TEST6_BAR = 'baz';
    underTest = new UnderTest();

    underTest.fulfill({
      'name': 'test6',
      'keys': [
        '#/bar'
      ]
    }, function () {
      expect(underTest.get('test6', '#/bar')).toBe('baz');
      process.env.TEST6_BAR = 'foo';
      underTest.renew('test6', function (err) {
        expect(err).toNotExist();
        expect(underTest.get('test6', '#/bar')).toBe('foo');
        done();
      });
    });
  });

  it('should renew an existing configuration if renewAll is called', function (done) {
    process.env.TEST7_BAR = 'baz';
    underTest = new UnderTest();

    underTest.fulfill({
      'name': 'test7',
      'keys': [
        '#/bar'
      ]
    }, function () {
      expect(underTest.get('test7', '#/bar')).toBe('baz');
      process.env.TEST7_BAR = 'foo';
      underTest.renewAll(function (err) {
        expect(err).toNotExist();
        expect(underTest.get('test7', '#/bar')).toBe('foo');
        done();
      });
    });
  });

  describe('namespacing', function () {
    before('Create initial namespace', function (done) {
      underTest = new UnderTest();
      process.env.TEST8_BAR = 'baz';
      underTest.fulfill({
        'name': 'test8',
        'keys': [
          '#/bar'
        ]
      }, function (errs) {
        if (errs) {
          throw new Error('Configurator test setup failed');
        } else {
          done();
        }
      });
    });

    it('should separate different configuration specifications', function (done) {
      underTest = new UnderTest();
      process.env.TEST9_BAR = 'bar';
      underTest.fulfill({
        'name': 'test9',
        'keys': [
          '#/bar'
        ]
      }, function (errs) {
        if (errs) {
          throw new Error('Configurator test setup failed');
        } else {
          expect(underTest.get('test8', '#/bar')).toBe('baz');
          expect(underTest.get('test9', '#/bar')).toBe('bar');
          done();
        }
      });
    });
  });

  it('should fulfill config specifications passed as an array', function (done) {
    underTest = new UnderTest();
    process.env.TEST10_BAR = 'bar';
    process.env.TEST11_FOO = 'foo';

    underTest.fulfill([
      { 'name': 'test10', 'keys': ['#/bar'] },
      { 'name': 'test11', 'keys': ['#/foo'] }
    ], function (errs) {
      if (errs) {
        throw new Error('Configurator test setup failed');
      } else {
        expect(underTest.get('test10', '#/bar')).toBe('bar');
        expect(underTest.get('test11', '#/foo')).toBe('foo');
        done();
      }
    });
  });

  it('should make configuration via a json-ptr get call', function (done) {
    process.env.TEST12_FOO_BAZ = 'bar';
    underTest = new UnderTest();
    underTest.fulfill({
      'name': 'test12',
      'keys': [
        '#/foo/baz'
      ]
    }, function (errs) {
      expect(errs).toNotExist();
      expect(underTest.get('#/test12/foo/baz')).toBe('bar');
      done();
    });
  });

});
