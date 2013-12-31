var assert = require('assert');

var utils = require('../lib/utils');

describe('utils', function() {
  describe('envToVarName', function() {
    it('should convert a_b to aB', function() {
      assert.equal(utils.envToVarName('a_b'), 'aB');
    });

    it('should preserve leading underscores', function() {
      assert.equal(utils.envToVarName('_ab'), '_ab');
    });
  });
});
