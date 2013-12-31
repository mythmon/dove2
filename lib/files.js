var path = require('path');
var Promise = require('es6-promise').Promise;
var fs = require('fs');

var utils = require('./utils');


function tree(base, opts) {
  if (!opts) {
    opts = {};
  }

  opts.hidden = opts.hidden || false;
  opts.maxDepth = opts.maxDepth || Infinity;
  opts._curDepth = opts._curDepth || 1;
  opts._base = opts._base || base;

  return utils.errResWrap(fs.readdir, base)
    .then(function filterHidden(dirContents) {
      if (opts.hidden) {
        return dirContents;
      } else {
        return dirContents.filter(function(path) {
          return path.charAt(0) !== '.';
        });
      }
    })

    .then(function fillPaths(dirContents) {
      return dirContents.map(function(filename) {
        return path.join(base, filename);
      });
    })

    .then(function getStats(dirContents) {
      return Promise.all(dirContents.map(function(filePath) {
        return utils.errResWrap(fs.stat, filePath)
          .then(function(stat) {
            return {
              path: filePath,
              stat: stat,
            };
          }, function(err) {
            return {
              path: filePath,
              err: err,
            };
          });
      }));
    })

    .then(function convertStat(dirContents) {
      return dirContents.map(function(cont) {
        if (cont.err) return cont;

        if (cont.stat.isDirectory()) {
          cont.type = 'dir';
        } else if (cont.stat.isFile()) {
          cont.type = 'file';
        } else {
          cont.type = 'unknown';
        }
        cont.isDir = cont.stat.isDirectory();
        delete cont.stat;
        return cont;
      });
    })

    .then(function recurse(dirContents) {
      return Promise.all(dirContents.map(function(cont) {
        if (cont.isDir) {
          if (opts._curDepth >= opts.maxDepth) {
            cont.children = null;
            return cont;
          } else {
            var new_opts = {
              hidden: opts.hidden,
              maxDepth: opts.maxDepth,
              _curDepth: opts._curDepth + 1,
              _base: opts._base,
            };
            return tree(cont.path, new_opts)
              .then(function(contents) {
                cont.children = contents;
                return cont;
              });
          }
        } else {
          return cont;
        }
      }))

      .then(function stripBase(dirContents) {
        return dirContents.map(function(cont) {
          cont.path = path.relative(opts._base, cont.path);
          cont.fileName = path.basename(cont.path);
          return cont;
        });
      });
    });
}

module.exports = {
  tree: tree,
};
