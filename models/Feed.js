 /*jslint node: true */
 module.exports = function (mongoose) {
    'use strict';

    var FeedSchema = new mongoose.Schema({
        title: {type: String},
        link: {type: String, index: true, unique: true},
        description: {type: String},
        pubDate: {type: Date},
        groups: [String],
        tags: [String]
    });

    var Feed = mongoose.model('Feed', FeedSchema);
    
    var FeedStatuses =  {
        LinkAndGroupAlreadyExists: 1,
        PushedGroupIntoLink: 2,
        LinkDoesNotExist: 3
    };

    var _appendGroupIfLinkExists = function(group, link, callback) {
        Feed.findOne({link: link}, function (err, feed) {
            if(err) {
                callback(err);
                return;
            }

            if(feed) {
                if(feed.groups.indexOf(group) <  0) {
                    // record exists, just push the new group
                    feed.groups.push(group);
                    feed.save(function (err) {
                        if(err) {
                            callback(err);
                            return;
                        }

                        callback(null, FeedStatuses.PushedGroupIntoLink);
                    });
                }
                else {
                    // record already contains the group
                    callback(null, FeedStatuses.LinkAndGroupAlreadyExists);
                }
            }
            else {
                // record does not esit
                callback(null, FeedStatuses.LinkDoesNotExist);
            }
        });
    };

    // duplicate checks are supposed to be done earlier
    // so if you fail at validation you probably deserved it
    var _insertFeed = function (group, title, link, description, pubDate, tags, callback) {
        var feed = new Feed({
            groups: [group],
            title: title,
            link: link,
            description: description,
            pubDate: pubDate,
            tags: tags
        });

        feed.save(function (err) {
            if(err) {
                callback(err);
                return;
            }

            callback(null, 'Added Feed');
        });
    };

    var _retrieveFeeds = function(group, date, callback) {
        Feed.find({pubDate: {$lt: date}, groups: group}).limit(13).lean().exec(function (err, results) {
            if(err) {
                callback(err);
            }
            else {
                callback(null, results.map(function(result) {
                    // removing uncessary items in results
                    delete result.groups;
                    delete result.__v;
                    delete result._id;

                    return result;
                }));
            }
        });
    };

    return {
        retrieveFeeds: _retrieveFeeds,
        doesFeedExist: _appendGroupIfLinkExists,
        insertFeed: _insertFeed,
        Feed: Feed,
        Status: FeedStatuses
    };
};