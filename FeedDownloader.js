var FeedDownloader = function () {
    "use strict";

    var url = require('url');
    var htmlparser = require('htmlparser');
    var async = require('async');
    var http = require('http');
    var Buffer = require('buffer').Buffer;
    var Win1254 = require('./encoders/win1254');
    var select = require('soupselect').select;
    var mongoose = require('mongoose');
    var Feed = require('./models/Feed.js')(mongoose);

    var _parseKeywords = function(domJson) {

        var keywords = [];
        select(domJson, "div.index_keywords a h2").forEach(function (item) {
            keywords.push(Win1254.toUTF8(item.children[0].raw));
        });

        return keywords;
    };

    var _urlDownloader = function (options, downloadComplete) {
        var urlHandler = new htmlparser.DefaultHandler(function (err, dom) {
            if(err) {
                downloadComplete(err);
            }

            console.log('finished downloading: ' + options.path);
            downloadComplete(null, dom);
        });

        var urlParser = new htmlparser.Parser(urlHandler);

        var req = http.request(options, function (res) {
            res.setEncoding('binary');
            res.on('data', function (chunk) {
                urlParser.parseChunk(chunk);
            });

            res.on('end', function () {
                urlParser.done();
            });
        });

        req.on('error', function (err) {
            console.log('error occurred');
            throw err;
        });

        req.end();
    };

    /**
    * first the rss feed is downloaded. rss handler parses individual items and
    * downloads the referenced url sequentially. Upon each download, keywords are
    * extracted from the link. The results are stored in a mongo Schema called Feed.
    */
    var _download = function (options, callback) {
        var groupId = options.id;
        var urlOptions = url.parse(options.url);

        var rssHandler = new htmlparser.RssHandler(function (err, dom) {
            if(err) {
                throw err;
            }

            if(dom.items) {
                async.eachSeries(dom.items, function (item, urlDownloadComplete) {

                    console.log('downloading: ' + item.link);
                    _urlDownloader(url.parse(item.link), function (err, dom) {
                        if(err) {
                            throw err;
                        }

                        var keywords = _parseKeywords(dom);
                        if(keywords.length === 0) {
                            console.log('no keywords');
                        }
                        
                        Feed.insertFeed('radikal', item.title, item.link, item.description, item.pubDate, keywords, function (err, msg) {
                            if(err) {
                                urlDownloadComplete(err);
                            }
                            else {
                                urlDownloadComplete(null);
                            }
                        });
                    });
                }, function (err) {
                    if(err) {
                        if(err.msg && err.msg === 'Feed Exists') {
                            callback(null, 'feed already inserted');
                            return;
                        }

                        throw err;
                    }

                    callback(null, 'inserted all feeds');
                });
            }
        });

        var rssParser = new htmlparser.Parser(rssHandler);

        var req = http.request(urlOptions, function (res) {
        res.setEncoding('utf8');
        rssParser.reset();

        res.on('data', function (chunk) {
            rssParser.parseChunk(chunk);
        });

        res.on('end', function () {
            rssParser.done();
        });
    });

    req.on('error', function (err) {
        throw err;
    });

    req.end();

    };

    return {
        download: _download
    };
}();

module.exports = FeedDownloader;