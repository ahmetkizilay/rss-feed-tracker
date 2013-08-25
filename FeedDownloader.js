var FeedDownloader = function (models) {
    /*jslint node: true */
    'use strict';

    var url = require('url');
    var htmlparser = require('htmlparser');
    var async = require('async');
    var http = require('http');
    var encoder = require('./encoders');
    var select = require('soupselect').select;
    
    var Feed = models.Feed;
    var LatestFeed = models.LatestFeed;

    var _parseKeywords = function(domJson, query) {
        var keywords = [];
        select(domJson, query).forEach(function (item) {
            keywords.push(item.children[0].raw);
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
            res.setEncoding('utf-8');
            var content_type = null;

            if(res.headers['content-type']) {
                console.log(res.headers['content-type']);
                var encMatchResult = res.headers['content-type'].match(/charset=([^;]*)([;]+|$)/);
                if(encMatchResult !== null && encMatchResult.length > 1 && encMatchResult[1].toLowerCase().indexOf('utf') < 0) {
                    content_type = encMatchResult[1].toLowerCase();
                    res.setEncoding('binary');
                }

            }

            //console.log(content_type);

            res.on('data', function (chunk) {
                if(content_type) {
                    chunk = encoder(content_type).toUTF8(chunk);
                }

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
        var keywordsQuery = options.tag_path;

        var rssHandler = new htmlparser.RssHandler(function (err, dom) {
            if(err) {
                throw err;
            }

            if(dom.items) {
                LatestFeed.getLatestFeedForGroup(groupId, function (err, pubDate) {
                    if(err) {
                        throw err;
                    }

                    async.eachSeries(dom.items.reverse(), function (item, urlDownloadComplete) {
                        console.log(item.link);
                        if(pubDate !== null) {
                            if(item.pubDate.getTime() < pubDate.getTime()) {
                                urlDownloadComplete();
                                return;
                            }
                        };

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
                                    urlDownloadComplete();
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

                                        var keywords = _parseKeywords(dom, keywordsQuery);
                                        if(keywords.length === 0) {
                                            console.log('no keywords');
                                        }
                                        else {
                                            console.log(keywords);
                                        }
                                        Feed.insertFeed(groupId, item.title, item.link, item.description, item.pubDate, keywords, function (err) {
                                            if(err) {
                                                urlDownloadComplete(err);
                                                return;
                                            }
                                            else {
                                                urlDownloadComplete();
                                            }
                                        });
                                    });
                                break;
                            }

                            // here the latest feed update will be taken care of aysncronously
                            pubDate = item.pubDate;
                            LatestFeed.setLatestFeedForGroup(groupId, pubDate);
                        });

                    }, function (err) {
                        if(err) {
                            callback(err);
                            return;
                        }

                        callback(null);
                    });
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

    var _downloadAllFeeds = function (jsonFeeds, callback) {
        // console.log('downloading items' + jsonFeeds.length);
        async.eachSeries(jsonFeeds, function (feed, done) {
            
            // here individual feed is downloaded
            _download(feed, function (err) {
                if(err) {
                    done(err);
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
    };

    return {
        download: _download,
        downloadAllFeeds: _downloadAllFeeds
    };
};

module.exports = FeedDownloader;