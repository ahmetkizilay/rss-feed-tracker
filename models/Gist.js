module.exports = function (mongoose) {
    "use strict";

    var GistSchema = new mongoose.Schema({
        id: {type: String, unique: true, index: true},
        group: {type: String, unique: true}
    });

    var Gist = mongoose.model('Gist', GistSchema);

    var _insertGist = function (id, group, callback) {
        var gist = new Gist({
            id: id,
            group: group
        });

        gist.save(function (err) {
            callback(err);
        });
    };

    var _doesGistExist = function (group, callback) {
        Gist.findOne({group: group}, function (err, gist) {
            if(err) {
                callback(err);
                return;
            }

            if(gist !== null) {
                callback(null, true, gist.id);
            } else {
                callback(null, false);
            }
        })
    };

    return {
        insertGist: _insertGist,
        doesGistExist: _doesGistExist
    };
};