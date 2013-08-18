var FeedDownloader = function () {
    "use strict";

    var url = require('url');
    var htmlparser = require('htmlparser');
    var async = require('async');
    var fs = require('fs');
    var http = require('http');
    var Buffer = require('buffer').Buffer;
    var Win1254 = require('./encoders/win1254');
    var select = require('soupselect').select;
    
    var Feed = APP.models.Feed;

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
        var urlOptions = url.parse(options.link);

        var rssHandler = new htmlparser.RssHandler(function (err, dom) {
            if(err) {
                throw err;
            }

            if(dom.items) {
                async.eachSeries(dom.items, function (item, urlDownloadComplete) {
                    console.log(item.link);
                    // checking if link with the same feed id exists
                    // if not, downloads the link and parses the keyword
                    // also when a duplicate document is found, it is assumed that rest of the items in the feed are also already added.
                    // and continues to the other feed 
                    Feed.doesFeedExist(groupId, item.link, function (err, status) {
                        if(err) {
                            throw err;
                        }

                        switch(status) {
                            case Feed.Status.LinkAndGroupAlreadyExists: // exit the series loop
                                // console.log('link and group already added');
                                urlDownloadComplete({msg: 'Feed Exists'});
                            break;
                            case Feed.Status.PushedGroupIntoLink: // continue to the next item
                                // console.log('group pushed into the link');
                                urlDownloadComplete();
                            break;
                            case Feed.Status.LinkDoesNotExist: // download the link
                                console.log('downloading: ' + item.link);
                                _urlDownloader(url.parse(item.link), function (err, dom) {
                                    if(err) {
                                        throw err;
                                    }

                                    var keywords = _parseKeywords(dom);
                                    if(keywords.length === 0) {
                                        console.log('no keywords');
                                    }
                                    
                                    Feed.insertFeed(groupId, item.title, item.link, item.description, item.pubDate, keywords, function (err, msg) {
                                        if(err) {
                                            urlDownloadComplete(err);
                                        }
                                        else {
                                            urlDownloadComplete(null);
                                        }
                                    });
                                });
                            break;
                        }
                    });

                }, function (err) {
                    if(err) {
                        callback(err);
                        return;
                    }

                    callback(null);
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

    var _downloadAllFeeds = function (feedsPath, callback) {
        fs.readFile(feedsPath, {encoding: 'utf-8'}, function (err, data) {
            if(err) throw err;

            var jsonFeeds = JSON.parse(data);
            var doneWithoutError = true;

            async.eachSeries(jsonFeeds, function (feed, done) {
                // here individual feed is downloaded
                _download(feed, function (err, msg) {
                    if(err) {
                        if(err.msg && err.msg === 'Feed Exists') {
                            // console.log('this already added');
                            done();
                        }
                        else {
                            done(err);
                        }
                    }
                    else {
                        done();
                    }
                });

            }, function (err) {
                if(err) {
                    throw err;
                }
                else {
                    callback(null, 'process completed without error');
                }
            });
        });
    };

    return {
        download: _download,
        downloadAllFeeds: _downloadAllFeeds
    };
}();

module.exports = FeedDownloader;