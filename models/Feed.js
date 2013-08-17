module.exports = function (mongoose) {
    "use strict";
    
    var FeedSchema = new mongoose.Schema({
        title: {type: String},
        link: {type: String, index: true, unique: true},
        description: {type: String},
        pubDate: {type: Date},
        groups: [String],
        tags: [String]
    });

    var Feed = mongoose.model('Feed', FeedSchema);

    var _doesFeedExist = function(group, link, callback) {
        Feed.findOne({link: link}, function (err, feed) {
            if(err) {
                callback(err);
                return;
            }

            if(feed) {
                if(feed.groups.indexOf(group) <  0) {
                    callback(null, false);
                }
                else {
                    callback(null, true);
                }
            }
            else {
                callback(null, false);
            }
        });
    };

    var _insertFeed = function (group, title, link, description, pubDate, tags, callback) {
        Feed.findOne({link: link}, function (err, feed) {
            if(err) {
                callback(err);
                return;
            }

            if(feed) {
                if(feed.groups.indexOf(group) > -1) { // link exists, and feed already inserted
                    callback({msg: 'Feed Exists'});
                }
                else { // link exists but in another feed
                    feed.groups.push(group);
                    feed.save(function (err) {
                        if(err) {
                            callback(err);
                            return;
                        }

                        callback(null, 'Added Feed');
                    });
                }

            }
            else { // link does not exist yet
                feed = new Feed({
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
            }
        });
    };

    return {
        doesFeedExist: _doesFeedExist,
        insertFeed: _insertFeed,
        Feed: Feed
    };
};