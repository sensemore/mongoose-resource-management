const mongoose = require('mongoose');
const mongooseResourceManagement = require('../mongooseResourceManagement');
const resourceTypes = require('../resourceTypes');
const schema = new mongoose.Schema({
    name: String,
    founded: Date

});
mongooseResourceManagement.registerResource({
    schema,
    resourceType: resourceTypes.COMPANY,
    parent: null,
});


const Company = mongoose.model('Company', schema, "companies");



module.exports = Company;