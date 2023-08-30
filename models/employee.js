const mongoose = require('mongoose');
const Department = require('./department');
const mongooseResourceManagement = require('../mongooseResourceManagement');
const resourceTypes = require('../resourceTypes');
const schema = new mongoose.Schema({
    name: String,
    surname: String,
    title: String,
    department: { type: mongoose.ObjectId, ref: Department },
});
mongooseResourceManagement.registerResource({
    schema,
    resourceType: resourceTypes.EMPLOYEE,
    parent: {
        resourceType: resourceTypes.DEPARTMENT,
        localField: "department"
    }
});

const Employee = mongoose.model('Employee', schema, 'employees');
module.exports = Employee;