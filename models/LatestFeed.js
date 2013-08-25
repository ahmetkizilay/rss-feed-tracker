 /*jslint node: true */
 module.exports = function (mongoose) {
    'use strict';

    var LatestFeedSchema = new mongoose.Schema({
        group: {type: String, unique: true, index: true},
        pubDate: {type: Date}
    });

    var LatestFeed = mongoose.model('LatestFeed', LatestFeedSchema);

    var _setLatestFeedForGroup = function(group, pubDate) {
        LatestFeed.update({group: group}, {$set: {pubDate: pubDate}}, {upsert: true}, function (err) {
            if(err) {
                throw err;
            }
        });
    };

    var _getLatestFeedForGroup = function (group, callback) {
        LatestFeed.findOne({group: group}, function (err, latestFeed) {
            if(err) {
                callback(err);
                return;
            }

            if(latestFeed) {
                callback(null, latestFeed.pubDate);
            }
            else {
                callback(null, null);
            }
        });
    };

    return {
        setLatestFeedForGroup: _setLatestFeedForGroup,
        getLatestFeedForGroup: _getLatestFeedForGroup
    };
};