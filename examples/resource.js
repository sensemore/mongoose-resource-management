const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    ref: mongoose.Types.ObjectId,
    path: String,
    resourceType:String
});

const Resource = mongoose.model('Resource', schema, 'resources');
module.exports = Resource;