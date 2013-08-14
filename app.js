var cronJob = require('cron').CronJob;
var url = require('url');
var http = require('http');
var htmlparser = require('htmlparser');
var async = require('async');
var Buffer = require('buffer').Buffer;
var Win1254 = require('./encoders/win1254');

var jsonQuery = require('json-query');
var mongoose = require('mongoose');
var Feed = require('./models/Feed.js')(mongoose);

mongoose.connect('mongodb://localhost/rssfeedtracker');

var cronTime = "*/5 * * * * *";
var testUrl = "http://www.radikal.com.tr/d/rss/Rss_77.xml";

var parseKeywords = function(domJson) {
    var filter = {
        test: function(input) {
            var result;
            try {
                input.forEach(function (ddd) {
                    
                    if(ddd.name ==='meta' && ddd.attribs.name === 'keywords') {
                        result = ddd.attribs.content;
                        throw {msg: "custom error"};
                    }
                });
            }
            catch(e) {
                if(e.msg === undefined || e.msg !== 'custom error') {
                    throw e;
                }
            }

            return result;
        }
    };

    var queryInput = {
        tags: domJson
    };

    var queryResult = jsonQuery('tags[name=html].children[name=head].children:test', {
        rootContext: queryInput, filters: filter
    }).value;

    console.log(Win1254.toUTF8(queryResult));
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

                    parseKeywords(dom);

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
        //var output = '';
        res.on('data', function (chunk) {
            //output += chunk;
            urlParser.parseChunk(chunk);
        });

        res.on('end', function () {
            urlParser.done();
            //var buffer = Buffer.concat(data);

            //console.log(output);
        });
    });

    req.on('error', function (err) {
        console.log('error occurred');
        throw err;
    })

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