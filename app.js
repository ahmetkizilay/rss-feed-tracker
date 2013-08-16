var cronJob = require('cron').CronJob;
var async = require('async');
var FeedDownloader = require('./FeedDownloader');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/rssfeedtracker');

var cronTime = "*/5 * * * * *";
var testUrl = "http://www.radikal.com.tr/d/rss/Rss_77.xml";

var job = new cronJob({
    cronTime: cronTime,
    onTick: function() {
        console.log("cron activated");

        FeedDownloader.download({id: 'Radikal', url: testUrl}, function (err, msg) {
            console.log(msg);
        });
    },
    start: true,
});

job.start();