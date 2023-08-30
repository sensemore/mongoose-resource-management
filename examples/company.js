const mongoose = require('mongoose');
const mrm = require('..');
const resourceTypes = require('./resourceTypes');
const schema = new mongoose.Schema({
    name: String,
    founded: Date

});
mrm.registerResource({
    schema,
    resourceType: resourceTypes.COMPANY,
    parent: null,
});


const Company = mongoose.model('Company', schema, "companies");



module.exports = Company;