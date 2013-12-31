var Promise = require('es6-promise').Promise;
var thetvdbApi = require('thetvdb-api');

var utils = require('./utils');


var tvDBKey = 'DEADBEEF';
var tvDB = thetvdbApi(tvDBKey);


var recommendationFormat = '{series} S{season!p2}E{episode!p2} {name}.{fileType}'.format();

var sxeyRegex = /(.*)[\s\.-_]s(\d+)e(\d+).*\.([\w\d]{3,})/;
var xxyRegex = /(.*)[\s\.-_](\d+)x(\d+).*\.([\w\d]{3,})/;

function guessFileInfo(filename) {
  filename = filename.toLowerCase();

  var match;
  var ret = {};
  var anyMatch = false;

  match = filename.match(sxeyRegex);
  if (!match) {
    match = filename.match(xxyRegex);
  }
  if (match) {
    ret.series = match[1];
    ret.season = parseInt(match[2], 10);
    ret.episode = parseInt(match[3], 10);
    ret.fileType = match[4];
    anyMatch = true;
  }

  if (anyMatch) {
    ret.series = ret.series.replace(/[\.\-_]/g, ' ').trim();
    ret.mediaType = 'tv';
    return ret;
  } else {
    return null;
  }
}

function recommendName(filename) {
  var fileInfo = guessFileInfo(filename);

  if (fileInfo === null) {
    return filename;
  }

  return utils.errResWrap(tvDB.getSeries, fileInfo.series).then(
    function getEpisodes(ret) {
      var seriesId = ret.Data.Series.seriesid;
      return utils.errResWrap(tvDB.getSeriesAllById, seriesId);

    }).then(function findEpisode(ret) {
      for (var i = 0; i < ret.Data.Episode.length; i++) {
        var ep = ret.Data.Episode[i];
        if (ep.EpisodeNumber === fileInfo.episode &&
            ep.SeasonNumber === fileInfo.season) {
          return [ret.Data.Series, ep];
        }
      }
      throw new Error('No matching episode');

    }).then(function buildRecommendation(seriesAndEp) {
      var series = seriesAndEp[0];
      var ep = seriesAndEp[1];

      return recommendationFormat({
        series: series.SeriesName,
        season: ep.SeasonNumber,
        episode: ep.EpisodeNumber,
        name: ep.EpisodeName,
        fileType: fileInfo.fileType,
      });

    }).catch(function(err) {
      console.log('err:', err);
    });
}


// recommendName('orange.is.the.new.black.s01e13.720p.webrip.sujaidr.mkv').then(console.log);


module.exports = {
  recommendName: recommendName,
  guessFileInfo: guessFileInfo,
};
