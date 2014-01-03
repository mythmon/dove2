var path = require('path');

var config = require('./config');
var web = require('./web');


function Dove() {
  this.dirname = path.normalize(__dirname + '/../');
  this.config = config;

  this.start = function() {
    this.web = web.start(this);
  };
}

module.exports = {
  start: function() {
    var core = new Dove();
    core.start();
    return core;
  }
};
