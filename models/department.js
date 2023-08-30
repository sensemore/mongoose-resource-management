const mongoose = require('mongoose');
const Building = require('./building');
const mongooseResourceManagement = require('../mongooseResourceManagement');
const resourceTypes = require('../resourceTypes');
const schema = new mongoose.Schema({
    name: String,
    building: { type: mongoose.ObjectId, ref: Building },
});

mongooseResourceManagement.registerResource({
    schema,
    resourceType: resourceTypes.DEPARTMENT,
    parent: {
        resourceType: resourceTypes.BUILDING,
        localField: "building"
    }
});


const Department = mongoose.model('Department', schema, 'departments');
module.exports = Department;