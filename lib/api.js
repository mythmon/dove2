var path = require('path');

var Promise = require('es6-promise').Promise;

var files = require('./files');
var config = require('./config');

function end(res) {
  return function() {
    res.end();
  };
}


function start(core) {
  var app = core.web.app;
  var bases = config.fileBases;
  var maxDepth = 2;

  app.get('/api/files', function(req, res) {
    var keys = [];
    for (var key in bases) {
      keys.push(key);
    }
    Promise.all(keys.map(function(key) {
      var base = bases[key];
      var opts = {
        hidden: req.query.hidden,
        maxDepth: 1,
        _base: path.resolve(base, '..'),
      };
      return files.tree(base, opts).then(function(contents) {
        return {
          fileName: key,
          path: key,
          type: 'dir',
          children: contents,
        };
      });
    }))
    .then(function(fullTree) {
      res.send({files: fullTree});
    }, function(err) {
      var status = 500;
      if (err.code === 'ENOENT') {
        status = 404;
      }
      res.send({error: err.code}, status);

    })
    .then(end(res), end(res));

  });

  app.get('/api/files/:base', function(req, res) {
    res.end('hmm');
  });

  app.get(/^\/api\/files\/([^\/]*)\/(.*)$/, function(req, res) {
    var base = bases[req.params[0]];
    var filePath = req.params[1];

    if (base === undefined) {
      res.end('', 404);
      return;
    }

    var fullPath = path.join(base, filePath);
    var opts = {
      hidden: req.query.hidden,
      maxDepth: maxDepth,
    };

    files.tree(fullPath, opts).then(function(contents) {
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
    res.end('hmm');
  });
}


module.exports = {
  start: start,
};
