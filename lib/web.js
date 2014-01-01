var fs = require('fs');
var http = require('http');
var path = require('path');

var express = require('express');
var stylus = require('stylus');
var nib = require('nib');
var Promise = require('es6-promise').Promise;
var archiver = require('archiver');

var utils = require('./utils');

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
    res.end(e, 404);
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

  files = files.map(function(f) {
    return path.join('/home/mythmon/src/dove2', f);
  });

  Promise.all(
    files.map(function(f) {
      return utils.errResWrap(fs.stat, f)
        .then(function(stat) {
          return stat.size;
        });

    })).then(function calcContentLength(sizes) {
      // Basic header
      var contentLength = 22;
      // The actual file sizes.
      contentLength += sizes.reduce(function(memo, size) { return memo + size; }, 0);
      // Each file name is included twice in the zip.
      contentLength += files.reduce(function(memo, f) {
        return memo + path.basename(f).length * 2;
      }, 0);
      // Each file has another 92 bytes in header.
      contentLength += 92 * files.length;
      // Done.
      return contentLength;

    }).then(function send(size) {
      console.log('sending', size, 'bytes');
      // res.setHeader('Content-Length', size);
      res.setHeader('Content-Disposition', 'attachment; filename=dove-bulk.zip');
      var ar = archiver('zip');
      ar.pipe(res);
      files.forEach(function(f) {
        ar.append(fs.createReadStream(f), {name: path.basename(f), store:true});
      });
      ar.finalize();
    });
});

/* Serve the promise.js file. */
app.get('/js/promise.js', serveFile('../node_modules/promisesaplus.js'));

function start(core_) {
  core = core_;
  app.set('dirname', core.dirname);
  app.set('port', core.config.port);

  // This has to come in this block, because it uses core directly.
  app.use(express.static(core.dirname + '/app/'));
  // This has to come after express.static.
  app.use(serveFile('index.html', false));

  server = http.createServer(app);
  server.listen(app.get('port'), function() {
    console.log('Listening on http://localhost:{0}'.format(app.get('port')));
  });
  server.app = app;

  return server;
}


module.exports = {
  start: start,
};
