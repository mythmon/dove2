var fs = require('fs');

var utils = require('./utils.js');

var config = {
  port: 8080,
  stateDir: 'state',
};

try {
  var dotEnv = fs.readFileSync('.env', {encoding: 'utf8'});
  dotEnv.split('\n').forEach(function(line) {
    if (line.length === 0) return;
    var key = line.split('=')[0];
    var val = line.split('=').slice(1).join('=');
    process.env[key] = val;
  });
} catch(e) {
  // pass
}

for (var key in process.env) {
  var val = process.env[key];
  try {
    val = JSON.parse(val);
  } catch(e) {}
  config[utils.envToVarName(key)] = val;
}

module.exports = config;
