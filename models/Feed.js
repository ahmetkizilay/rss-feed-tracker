module.exports = function (mongoose) {
    var FeedSchema = new mongoose.Schema({
        group: {type: String},
        title: {type: String},
        link: {type: String, unique: true},
        description: {type: String},
        pubDate: {type: Date},
        tags: [String]
    });

    var Feed = mongoose.model('Feed', FeedSchema);

    var insertFeed = function (group, title, link, description, pubDate, tags, callback) {
        var feed = new Feed({
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
            }

            callback(null, 'Added Feed');
        });
    };

    return {
        insertFeed: insertFeed,
        Feed: Feed
    };
};