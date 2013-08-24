(function () {
    
    var cronJob = require('cron').CronJob;
    var mongoose = require('mongoose');
    var async = require('async');
    var fs = require('fs');
    var cfg = require('./config');
    var models = require('./models')(mongoose);

    var FeedDownloader = require('./FeedDownloader')(models);
    var GistCreator = require('./GistCreator')(models);

    var cronTime = "*/5 * * * * *";
    var runAsJob = process.argv[2] !== undefined && process.argv[2] === 'true';

    var processSingleDataFile = function (dataJson, callback) {
        console.log('process single');

        async.series([
            function (done) {
               FeedDownloader.downloadAllFeeds(dataJson, function (err, msg) {
                   console.log(msg);
                   done(err);
               });
            },

            function (done) {
                console.log('starting gist');
                GistCreator.handleGist(dataJson, function (err, msg) {
                    if(err) {
                        console.log(err);
                    }
                    console.log(msg);
                    done(err);
                });
             }
        ], function (err) {
            callback(err);
        });
    };

    var mainMethod = function () {
        console.log('mainMethod started');

        var dataFiles = fs.readdirSync('data');
        async.eachSeries(dataFiles, function (dataFile, done) {
            
            var data = fs.readFileSync('data/' + dataFile);
            var dataJson = JSON.parse(data);

            processSingleDataFile(dataJson, done);

        }, function (err) {
            if(err) throw err;
            if(!runAsJob) process.exit();
        });
    };

    mongoose.connect(cfg.mongo.connection_string);

    if(!runAsJob) {
        mainMethod();
    }
    else {
        var job = new cronJob({
            cronTime: cronTime,
            onTick: function() {
                mainMethod();
            },
            start: true,
        });

        job.start();
    }
}).call(this);
