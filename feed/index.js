var casual = require('casual');
const mongoose = require('mongoose');
const Company = require('../models/company');
const Building = require('../models/building');
const Department = require('../models/department');
const Employee = require('../models/employee');

async function feed({
    companySize,
    buildingSize,
    departmentSize,
    employeeSize,
}) {
    let companies = [];
    let buildings = [];
    let departments = [];
    let employees = [];

    for (let i = 0; i < companySize; i++) {
        companies.push({
            _id: new mongoose.Types.ObjectId(),
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD'),
        });
    }

    for (let i = 0; i < buildingSize; i++) {
        buildings.push({
            _id: new mongoose.Types.ObjectId(),
            name: casual.building_name,
            adress: casual.address,
            company: companies[casual.integer(0, companySize - 1)]._id,
        });
    }

    for (let i = 0; i < departmentSize; i++) {
        departments.push({
            _id: new mongoose.Types.ObjectId(),
            name: casual.department_name,
            building: buildings[casual.integer(0, buildingSize - 1)]._id,
        });
    }

    for (let i = 0; i < employeeSize; i++) {
        employees.push({
            _id: new mongoose.Types.ObjectId(),
            name: casual.first_name,
            surname: casual.last_name,
            title: casual.title,
            department: departments[casual.integer(0, departmentSize - 1)]._id,
        });
    }

    await Company.insertMany(companies);
    await Building.insertMany(buildings);
    await  Department.insertMany(departments);
    await  Employee.insertMany(employees);

}

module.exports = feed;