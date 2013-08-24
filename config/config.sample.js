/*
 * See config/index.js for further explanation.
 * test config overrides global config values
 */

var config = require('./config.global');

config.env = 'development';
config.uri = 'localhost';

//mongo database credentials
config.mongo.uri = process.env.MONGO_URI || 'localhost';
config.mongo.db = 'rssfeedtracker';

// config.mongo.user = '';
// config.mongo.pass = '';
// config.mongo.port = 27017;

config.mongo.connection_string = 'mongodb://' + config.mongo.uri + '/' + config.mongo.db;

config.github_token = '';

module.exports = config;