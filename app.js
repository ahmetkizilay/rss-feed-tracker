APP = {};

var cronJob = require('cron').CronJob;
var mongoose = require('mongoose');
var async = require('async');

APP.models = require('./models')(mongoose);

var FeedDownloader = require('./FeedDownloader');
var GistCreator = require('./GistCreator');

var cronTime = "*/5 * * * * *";
var runAsJob = process.argv[2] !== undefined && process.argv[2] === 'true';

var mainMethod = function () {
    console.log('mainMethod started');

    async.series([
        function (done) {
           FeedDownloader.downloadAllFeeds('data/zaman.json', function (err, msg) {
               console.log(msg);
               done(null);
           });
        }
        // ,

        // function (done) {
        //     console.log('starting gist');
        //     GistCreator.handleGist('data/zaman.json', function (err, msg) {
        //         if(err) {
        //             console.log(err);
        //         }
        //         console.log(msg);
        //         done(null);
        //     });
        // }

    ], function (err) {
        if(!runAsJob) process.exit();
    });
};

mongoose.connect('mongodb://localhost/rssfeedtracker');

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