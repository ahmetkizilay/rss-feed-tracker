var cronJob = require('cron').CronJob;
var FeedDownloader = require('./FeedDownloader');
var mongoose = require('mongoose');

var cronTime = "*/5 * * * * *";
var runAsJob = process.argv[2] !== undefined && process.argv[2] === 'true';

var mainMethod = function () {
    console.log('mainMethod started');
    FeedDownloader.downloadAllFeeds('data/feeds.json', function (msg) {
        console.log(msg);
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