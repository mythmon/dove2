var fs = require('fs');
var http = require('http');
var path = require('path');

var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var Promise = require('es6-promise').Promise;
var archiver = require('archiver');

var utils = require('./utils');
var files = require('./files');
var config = require('./config');


var server;
var app = express();
var core;

// Use GZip
app.use(express.compress());
// Parse POST bodies as JSON.
app.use(express.json());


function readFile(path) {
  return new Promise(function(resolve, reject) {
    fs.readFile(path, function(err, contents) {
      if (err) {
        reject(err);
      } else {
        resolve(contents.toString());
      }
    });
  });
}


/* Serve a file, with cache. */
function serveFile(filePath, fail) {
  var cached;
  if (fail === undefined) {
    fail = true;
  }
  return function(req, res, next) {
    if (cached === undefined) {
      readFile(path.join(core.dirname, 'app', filePath)).then(function(contents) {
        cached = contents;
        req.end(contents);
      }, function err(e) {
        if (fail) {
          req.status(404).end(e);
        } else {
          next();
        }
      });
    } else {
      res.end(cached);
    }
  };
}


/* Compile and serve stylus files from the css directory. */
app.use('/css/', function(req, res, next) {
  if (!/.*.styl$/.exec(req.url)) {
    next();
    return;
  }

  res.set('Content-Type', 'text/css');
  var filename = path.join(core.dirname, 'app', 'css', req.url);
  readFile(filename, {encoding: 'utf8'}).then(function(contents) {
    var compiled = stylus(contents)
      .set('filename', filename)
      .use(nib())
      .render();
    res.end(compiled);
  }).catch(function err(e) {
    console.log('stylus error', e);
    res.status(404).send(e).end();
  });
});

app.get('/bulk', function(req, res) {
  var files = req.query.files;
  if (typeof files === 'string') {
    files = [files];
  } else if (files === undefined) {
    res.status(400).send({error: 'missing required parameter "files".'}).end();
    return;
  }

  var stop = false;
  
  var commonPath = utils.commonPathPrefix(files);
  var names = files.map(function(f) {
    return path.relative(commonPath, f);
  });

  files = files.map(function(f) {
    // Strip leading '/'
    f = f.replace(/^\/+/, '');
    var spl = f.split('/');
    var base = spl[0];
    var basePath = config.fileBases[base];
    var filePath = spl.slice(1).join('/');
    if (basePath === undefined) {
      res.status(404).send({error: 'Base {0} not found.' + base}).end();
      throw new Error();
    }
    return path.join(basePath, filePath);
  });

  if (stop) {
    return;
  }

  Promise.all(files.map(function(f) {
      return utils.errResWrap(fs.stat, f);
    }))

    .then(function filterOutDirs(stats) {
      return stats.filter(function(stat) {
        return stat.isFile();
      }).map(function(stat) {
        return stat.size;
      });

    }).then(function calcContentLength(sizes) {
      /* Without a content-length, the browser doesn't give a progress
       * bar, which is lame. However, inaccurate content-lengths are
       * really bad, because it causes the browser to either hang
       * waiting for more bytes (if it is too big), or stop early (if it
       * is too small.).
       *
       * This tries to predict the size of an uncompressed zip
       * containing the files asked for. It has been accurate in my tests.
       */

      // Basic header
      var contentLength = 22;
      // The actual file sizes.
      contentLength += sizes.reduce(function(memo, size) { return memo + size; }, 0);
      // Each file name is included twice in the zip.
      contentLength += names.reduce(function(memo, name) {
        return memo + name.length * 2;
      }, 0);
      // Each file has another 92 bytes in header.
      contentLength += 92 * files.length;
      // Done.
      return contentLength;

    }).then(function send(size) {
      res.setHeader('Content-Length', size);
      res.setHeader('Content-Disposition', 'attachment; filename=dove-bulk.zip');
      var ar = archiver('zip');
      ar.pipe(res);
      files.forEach(function(f, i) {
        ar.append(fs.createReadStream(f), {name: names[i], store: true});
      });
      ar.finalize();

    }).catch(function err(e) {
      // console.log('err', e);
      res.status(500).send({error: e}).end();
      console.dir(e);
    });
});

/* Serve the promise.js file. */
app.get('/js/promise.js', serveFile('../node_modules/promisesaplus.js'));

function end(res) {
  return function() {
    res.end();
  };
}


var maxDepth = 2;

app.get('/api/files', function(req, res) {
  var keys = [];
  for (var key in config.fileBases) {
    keys.push(key);
  }
  Promise.all(keys.map(function(key) {
    var basePath = config.fileBases[key];
    var opts = {
      hidden: req.query.hidden,
      maxDepth: parseInt(req.query.maxDepth, 10) || maxDepth,
      originalBase: path.resolve(basePath, '..'),
    };
    if (parseInt(req.query.maxDepth, 10) === 0) {
      return {
        fileName: key,
        path: key,
        type: 'dir',
        children: '...',
      };
    } else {
      return files.tree(basePath, opts).then(function(contents) {
        return {
          fileName: key,
          path: key,
          type: 'dir',
          children: contents,
        };
      });
    }
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

app.get(/^\/api\/files\/([^\/]*)(.*)$/, function(req, res) {
  var base = req.params[0];
  var basePath = config.fileBases[base];
  var filePath = req.params[1];

  if (basePath === undefined) {
    res.status(404).send({error: 'Base {0} not found.'.format(base)}).end();
    return;
  }

  var fullPath = path.join(basePath, filePath);
  var opts = {
    hidden: req.query.hidden,
    maxDepth: parseInt(req.query.maxDepth, 10) || maxDepth,
    originalBase: path.resolve(basePath, '..'),
  };

  files.tree(fullPath, opts).then(function(contents) {
    res.send({
      files: contents
    });
  }, function(err) {
    console.log(err);
    var status = 500;
    if (err.code === 'ENOENT') {
      status = 404;
    }
    res.send({error: err.code}, status);
  }).catch(function(e) {
    console.log('err', e);
    throw e;

  }).then(end(res), end(res));
});

app.get('/api/suggest', function(req, res) {
  res.end('hmm');
});


function start(core_) {
  core = core_;
  app.set('dirname', core.dirname);
  app.set('port', core.config.port);

  // This has to come in this block, because it uses core directly.
  app.use(express.static(core.dirname + '/app/'));
  // This has to come after express.static.
  var angularHome = serveFile('index.html', false);
  app.use(function(req, res, next) {
    if (req.path.indexOf('/api') === 0) {
      next();
    } else {
      angularHome(req, res);
    }
  });

  server = http.createServer(app);
  server.listen(app.get('port'), '0.0.0.0', function() {
    console.log('Listening on http://localhost:{0}'.format(app.get('port')));
  });
  server.app = app;

  return server;
}


module.exports = {
  start: start,
};
