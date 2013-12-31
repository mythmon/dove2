var files = require('./files');
var utils = require('./utils');





function end(res) {
  return function() {
    res.end();
  };
}


function start(core) {
  var app = core.web.app;

  app.get('/api/files', function(req, res) {
    var opts = {
      hidden: req.query.hidden,
    };

    files.tree('/home/mythmon/src/dove2/fs', opts).then(function(contents) {
      res.send({
        files: contents
      });
    }, function(err) {
      var status = 500;
      if (err.code === 'ENOENT') {
        status = 404;
      }
      res.send({error: err.code}, status);
    }).then(end(res), end(res));
  });

  app.get('/api/suggest', function(req, res) {

  });
}


module.exports = {
  start: start,
};
