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


module.exports = {
  envToVarName: envToVarName,
  errResCallback: errResCallback,
  errResWrap: errResWrap,
};
