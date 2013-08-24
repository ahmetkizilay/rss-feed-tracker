var ModelWrapper = function (mongoose) {
    /*jslint node: true */
    'use strict';

    var fs = require('fs');
    var models = {};

    var fileNames = fs.readdirSync('./models');
    fileNames.splice(fileNames.indexOf('index.js'), 1);

    for(var i = 0, len = fileNames.length; i < len; ++i) {
        var thisFileName  = fileNames[i];
        models[thisFileName.substring(0, thisFileName.indexOf('.'))] = require('./' + thisFileName)(mongoose);
    }

    return models;
};

module.exports = ModelWrapper;