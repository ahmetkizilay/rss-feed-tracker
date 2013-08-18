var GistCreator = function () {
    "use strict";

    var fs = require('fs');
    var async = require('async');
    var http = require('https');
    var Buffer = require('buffer').Buffer;
    var cfg = require('./config');
    
    var Feed = APP.models.Feed
    var Gist = APP.models.Gist;

    var _writeStringIntoRequest = function (str, req) {
        var chunkSize = 1024;
        var iteration = str.length / chunkSize;
        for(var i = 0; i < iteration; i++) {
            req.write(str.substring(i * chunkSize, (i + 1) * chunkSize));
        }
        req.write(str.substring(iteration * chunkSize, str.length));
    };

    var _createGist = function (gistName, results, date, callback) {
        var newGistFileObj = {};
        newGistFileObj[gistName] = {
            content: 'this is a collection of RSS feeds for ' + gistName
        }

        var gistCreatePostData = {
            'description': 'RSS Feeds For ' + gistName,
            'public': true,
            'files': newGistFileObj
        };

        var gistCreatePostString = JSON.stringify(gistCreatePostData, null, '\t');

        var gistCreatePostOptions = {
            host: 'api.github.com',
            port: 443,
            path: '/gists',
            method: 'POST',
            headers: {
                'Authorization': 'token ' + cfg.github_token,
                'Content-Length': Buffer.byteLength(gistCreatePostString), // adding content length gives error
                'Content-Type': 'application/json'
            }
        };

        var req = http.request(gistCreatePostOptions, function (res) {
            res.setEncoding('utf8');

            var output = '';
            res.on('data', function (chunk) {
                output += chunk;
            });

            res.on('end', function () {
                var jsonRes = JSON.parse(output);
                console.log(jsonRes.id);
                callback(null, jsonRes.id);
            });
        });

        req.on('error', function (err) {
            console.log(err);
            callback(err);
        });

        _writeStringIntoRequest(gistCreatePostString, req);
        console.log('about to send');
        req.end();
    };

    var _updateGist = function (gistId, results, date, callback) {
        var newGistFileName = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '.json';        
        var newGistFileObj = {};

        newGistFileObj[newGistFileName] = {
            content: JSON.stringify(results)
        }

        var gistCreatePostData = {
            'files': newGistFileObj
        };

        var gistCreatePostString = JSON.stringify(gistCreatePostData);
        console.log(gistCreatePostString.length);

        var gistCreatePostOptions = {
            host: 'api.github.com',
            port: 443,
            path: '/gists/' + gistId,
            method: 'PATCH',
            headers: {
                'Authorization': 'token 12ff0280389afdda4a1fd39eb834596c62e04140',
                'Content-Length': Buffer.byteLength(gistCreatePostString),
                'Content-Type': 'application/json; charset=UTF-8'
            }
        };

        var req = http.request(gistCreatePostOptions, function (res) {
            res.setEncoding('utf8');
            var statusCode = res.statusCode;
            var headers = res.headers;

            var output = '';
            res.on('data', function (chunk) {
                output += chunk;
            });

            res.on('end', function () {
                if(statusCode === 200) {
                    callback(null);
                }
                else {
                    callback({code: statusCode, headers: headers, msg: output});
                }
            });
        });

        req.on('error', function (err) {
            callback(err);
        });

        _writeStringIntoRequest(gistCreatePostString, req);

        req.end();
    };

    var _sendToGist = function (gistName, results, date, callback) {
        Gist.doesGistExist(gistName, function (err, yes, id) {
            if(err) {
                callback(err);
                return;
            }

            console.log('does gist exist? ' + yes);

            if(yes) {
                _updateGist(id, results, date, callback);
            }
            else {
                _createGist(gistName, results, date, function (err, id) {
                    Gist.insertGist(id, gistName, function (err) {
                        if(err) {
                            callback(err);
                        }
                        else {
                            _updateGist(id, results, date, callback);
                        }
                    });
                });
            }
        });
    };

    var _handleGist = function (feedsPath, callback) {
        fs.readFile(feedsPath, {encoding: 'utf-8'}, function (err, data) {
            if(err) {
                throw err;
            }

            var jsonFeeds = JSON.parse(data);

            async.eachSeries(jsonFeeds, function (feed, done) {
                var today = new Date();
                today.setHours(0, 0, 0, 0);

                Feed.retrieveFeeds(feed.id, today, function (err, feeds) {
                    if(err) {
                        console.log(err);
                        done(err);
                    }
                    else {
                        if(feeds && feeds.length > 0) {
                            _sendToGist(feed.id, feeds, today, function (err, response) {
                                if(err) {
                                    done(err);
                                    return;
                                }

                                done();
                            });
                        }
                        else {
                            done();
                        }
                    }
                });

            }, function (err) {
                callback(err, 'exiting method');
            });

        });
    };

    return {
        handleGist: _handleGist
    };
}();

module.exports = GistCreator;