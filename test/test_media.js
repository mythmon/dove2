var assert = require('assert');

var media = require('../lib/media');

describe('media', function() {
  describe('guessFileInfo', function() {

    var cases = [
      {
        input: 'orange.is.the.new.black.s01e13.720p.webrip.sujaidr.mkv',
        mediaType: 'tv',
        series: 'orange is the new black',
        season: 1,
        episode: 13,
        fileType: 'mkv'
      }, {
        input: 'Stargate SG-1 3x16 Urgo.mp4',
        mediaType: 'tv',
        series: 'stargate sg 1',
        season: 3,
        episode: 16,
        fileType: 'mp4'
      }, {
        input: 'White.Collar.S05E06.HDTV.x264-2HD.mp4',
        mediaType: 'tv',
        series: 'white collar',
        season: 5,
        episode: 6,
        fileType: 'mp4',
      }
    ];

    cases.forEach(function(testCase) {
      it('should work for ' + testCase.input, function() {
        var info = media.guessFileInfo(testCase.input);
        assert.strictEqual(info.series, testCase.series);
        assert.strictEqual(info.season, testCase.season);
        assert.strictEqual(info.episode, testCase.episode);
        assert.strictEqual(info.fileType, testCase.fileType);
        assert.strictEqual(info.mediaType, testCase.mediaType);
      });
    });

    it('should return null for unmatchable names.', function() {
      var info = media.guessFileInfo('asdf');
      assert.equal(info, null);
    });

    it('should return null for tricky unmatchable names.', function() {
      var info = media.guessFileInfo('doctor_who_2005.2013_christmas_special.the_time_of_the_doctor.hdtv_x264-fov.nfo');
      assert.equal(info, null);
    });
  });
});
