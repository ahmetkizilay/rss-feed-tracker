var cronJob = require('cron').CronJob;
var url = require('url');
var http = require('http');
var htmlparser = require('htmlparser');
var select = require('soupselect').select;
var async = require('async');
var Buffer = require('buffer').Buffer;
var Win1254 = require('./encoders/win1254');

var mongoose = require('mongoose');
var Feed = require('./models/Feed.js')(mongoose);

mongoose.connect('mongodb://localhost/rssfeedtracker');

var cronTime = "*/5 * * * * *";
var testUrl = "http://www.radikal.com.tr/d/rss/Rss_77.xml";

var parseKeywords = function(domJson) {

    var keywords = [];
    select(domJson, "div.index_keywords a h2").forEach(function (item) {
        keywords.push(Win1254.toUTF8(item.children[0].raw));
    });

    return keywords;
};

var feedDownloader = function(options, callbackComplete) {
    var rssHandler = new htmlparser.RssHandler(function (err, dom) {
        if(err) {
            throw err;
        }

        if(dom.items) {
            async.eachSeries(dom.items, function (item, urlDownloadComplete) {
                // download file
                console.log('downloading: ' + item.link);
                urlDownloader(url.parse(item.link), function (err, dom) {
                    if(err) {
                        throw err;
                    }

                    var keywords = parseKeywords(dom);
                    console.log(keywords);
                    
                    urlDownloadComplete(null);
                });
            }, function (err) {
                if(err) {
                    throw err;
                }

                callbackComplete();
            });
        }
    });

    var rssParser = new htmlparser.Parser(rssHandler);

    var req = http.request(options, function (res) {
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

var urlDownloader = function (options, callbackComplete) {
    var urlHandler = new htmlparser.DefaultHandler(function (err, dom) {
        if(err) {
            callbackComplete(err);
        }

        // insertFeedHere
        console.log('finished downloading: ' + options.path);
        callbackComplete(null, dom);
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

var job = new cronJob({
    cronTime: cronTime,
    onTick: function() {
        console.log("cron activated");

        feedDownloader(url.parse(testUrl));
    },
    start: true,
});

job.start();