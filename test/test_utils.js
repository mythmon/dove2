var assert = require('assert');

var utils = require('../lib/utils');

var _slice = Array.prototype.slice;

describe('utils', function() {
  describe('envToVarName', function() {
    it('should convert a_b to aB', function() {
      assert.equal(utils.envToVarName('a_b'), 'aB');
    });

    it('should preserve leading underscores', function() {
      assert.equal(utils.envToVarName('_ab'), '_ab');
    });
  });

  describe('commonPathPrefix', function() {
    function _test(/* ...paths, expected */) {
      var paths = _slice.call(arguments, 0, -1);
      var expected = arguments[arguments.length - 1];
      var actual = utils.commonPathPrefix(paths);
      assert.equal(expected, actual);
    }

    it('should be like dirname for a single path', function() {
      _test('foo/bar/baz', 'foo/bar');
    });

    it('should find a single common prefix with two args', function() {
      _test('foo/bar', 'foo/baz', 'foo');
    });

    it('should find a double common prefix with two args', function() {
      _test('foo/bar/baz', 'foo/bar/qux', 'foo/bar');
    });

    it('should find a single common prefix with two longer args', function() {
      _test('foo/bar/baz', 'foo/qux/buh', 'foo');
    });

    it('should find a common path among three args', function() {
      _test('foo/bar/baz', 'foo/bar/qux', 'foo/buh/huh', 'foo');
    });

    it('should return "" for paths with nothing in common', function() {
      _test('foo/bar/baz', 'huh/wat/why', '');
    });
  });
});
