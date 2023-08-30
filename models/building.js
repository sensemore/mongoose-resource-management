const mongoose = require('mongoose');
const Company = require('./company');
const mongooseResourceManagement = require('../mongooseResourceManagement');
const resourceTypes = require('../resourceTypes');

const schema = new mongoose.Schema({
    name: String,
    adress: String,
    company: { type: mongoose.ObjectId, ref: Company },

});
mongooseResourceManagement.registerResource({
    schema,
    resourceType: resourceTypes.BUILDING,
    parent: {
        resourceType: resourceTypes.COMPANY,
        localField: "company"
    }
});


const Building = mongoose.model('Building', schema, 'buildings');
module.exports = Building;