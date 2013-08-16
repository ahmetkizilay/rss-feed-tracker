module.exports = function (mongoose) {
    var FeedSchema = new mongoose.Schema({
        group: {type: String, index: true},
        title: {type: String},
        link: {type: String, index: true},
        description: {type: String},
        pubDate: {type: Date},
        tags: [String]
    });

    FeedSchema.index({group: 1, link: 1}, {unique: true});

    var Feed = mongoose.model('Feed', FeedSchema);

    var _insertFeed = function (group, title, link, description, pubDate, tags, callback) {
        Feed.findOne({group: group, link: link}, function (err, feed) {
            if(err) {
                callback(err);
                return;
            }

            if(feed) {
                callback({msg: 'Feed Exists'});
            }
            else {
                feed = new Feed({
                    group: group,
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
        insertFeed: _insertFeed,
        Feed: Feed
    };
};