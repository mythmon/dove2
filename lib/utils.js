var Promise = require('es6-promise').Promise;
// Adds String.prototype.format
require('string-format');


function envToVarName(str) {
  str = str.toLowerCase();
  return str.replace(/[^_]_[a-z]/g, function(match) {
    return match.charAt(0) + match.charAt(2).toUpperCase();
  });
}

String.prototype.format.transformers.p2 = function() {
  var num = this;
  if (num >= 0 && num < 10) {
    return '0' + num.toString();
  } else if (num < 0 && num > -10) {
    return '-0' + (-num).toString();
  } else {
    return num;
  }
};

function errResCallback(resolve, reject) {
  return function(err, res) {
    if (err) reject(err);
    resolve(res);
  };
}

function errResWrap(func /* ...args */) {
  var funcArgs = Array.prototype.slice.call(arguments, 1);

  return new Promise(function(resolve, reject) {
    funcArgs.push(errResCallback(resolve, reject));
    func.apply(null, funcArgs);
  });
}

/* Given an array of slash seperated paths, find the longest common prefix.
 * 
 * For example, 'foo/bar' and 'foo/baz' have 'foo' as the longest common
 * prefix. 'foo/bar/baz' and 'foo/bar/qux' have 'foo/bar as the longest
 * common prefix. Paths with nothing in common (like 'foo/bar' and 'baz/qux')
 * will return the empty string. */
function commonPathPrefix(paths) {
  /* prefixCommonness is a mapping whose keys are prefixes in the paths,
   * and who values are tuples containing the number of paths that share
   * that prefix and the length of the prefix (in terms of how many
   * slashes it has) */
  var prefixCommonness = {};

  paths.map(function(p) {
    return p.split('/');
  }).map(function(pSpl) {
    return pSpl.map(function(_, i) {
      return pSpl.slice(0, i).join('/');
    });
  }).forEach(function(prefixSet) {
    prefixSet.forEach(function(prefix) {
      if (prefixCommonness[prefix] === undefined) {
        if (prefix === '') {
          prefixCommonness[prefix] = [0, 0];
        } else {
          prefixCommonness[prefix] = [0, prefix.split('/').length];
        }
      }
      prefixCommonness[prefix][0] += 1;
    });
  });

  var longest = ['', 0];
  for (var key in prefixCommonness) {
    var pathCount = prefixCommonness[key][0];
    var pathLength = prefixCommonness[key][1];
    if (pathCount === paths.length) {
      if (pathLength > longest[1]) {
        longest = [key, pathLength];
      }
    }
  }
  return longest[0];
}


module.exports = {
  envToVarName: envToVarName,
  errResCallback: errResCallback,
  errResWrap: errResWrap,
  commonPathPrefix: commonPathPrefix,
};
