const mongoose = require('mongoose');
const Company = require('../models/company');
const Resource = require('../models/resource');
const casual = require('casual');
const resourceTypes = require('../resourceTypes');
const mongooseResourceManagement = require('../mongooseResourceManagement');
//pre test 
beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDB', { useNewUrlParser: true, useUnifiedTopology: true });
    await mongoose.connection.dropDatabase();

    mongooseResourceManagement.configure({
        refField: "ref",
        pathField: "path",
        resourceTypeField: "resourceType",
        collection: "resources",
    });



});

beforeEach(async () => {
    await mongoose.connection.dropDatabase();
});

afterAll(async () => {
    // await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});

test('save company', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    //act

    await company.save();
    const path = `/companies/${company._id.toString()}`;

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: 'Company' });
    expect(resources.length).toBe(1);
    expect(resources[0].path).toBe(path);
});

//create test for update, remove, findOneAndUpdate, findOneAndRemove, findOneAndDelete, deleteOne, deleteMany, insertMany

test('save with changes', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    //act
    await company.save();
    const path = `/companies/${company._id.toString()}`;
    company.name = casual.company_name;
    await company.save();

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: 'Company' });
    expect(resources.length).toBe(1);
    expect(resources[0].path).toBe(path);
});

test('remove company', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    //act
    await company.save();
    await Company.findOneAndDelete({ _id: company._id });

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: 'Company' });
    expect(resources.length).toBe(0);
});

test('find one and update', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    //act
    await company.save();

    const path = `/companies/${company._id.toString()}`;

    await Company.findOneAndUpdate({ _id: company._id }, { name: casual.company_name });

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: 'Company' });
    expect(resources.length).toBe(1);
    expect(resources[0].path).toBe(path);
});


test('find one and update no results', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    //act
    await company.save();
    const path = `/companies/${company._id.toString()}`;
    await Company.findOneAndUpdate({ this_field: "doesnt_exists" }, { name: casual.company_name });

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: 'Company' });
    expect(resources.length).toBe(1);
    expect(resources[0].path).toBe(path);
});



test('insert many', async () => {
    //arrange
    const companies = [];
    const createcount = 10;
    for (let i = 0; i < createcount; i++) {
        companies.push(new Company({
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD'),
        }));
    }

    //act
    await Company.insertMany(companies);
    //assert
    const resources = await Resource.find({ resourceType: 'Company' });
    expect(resources.length).toBe(createcount);
});

test('delete one', async () => {
    //arrange
    const companies = [];
    const createcount = 10;

    for (let i = 0; i < createcount; i++) {
        const company = new Company({
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD'),
        });
        companies.push(company);
    }
    await Company.insertMany(companies);

    //act
    const company = companies[casual.integer(0, companies.length - 1)];
    await Company.deleteOne({ _id: company._id });

    //assert
    const resources = await Resource.find({ resourceType: 'Company' });
    expect(resources.length).toBe(createcount - 1);
});

test('delete many', async () => {
    //arrange
    const createCount = 10;
    const deleteCount = 3;
    const companies = [];
    for (let i = 0; i < createCount; i++) {
        const company = new Company({
            _id: new mongoose.Types.ObjectId(),
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD'),
        });
        companies.push(company);
    }
    await Company.insertMany(companies);

    //act
    const deleteCompanies = [];
    for (let i = 0; i < deleteCount; i++) {
        companyToDelete = companies.splice(casual.integer(0, companies.length - 1), 1);
        deleteCompanies.push(companyToDelete[0]);
    }
    await Company.deleteMany({ _id: { $in: deleteCompanies.map(c => c._id) } });

    //assert
    const resources = await Resource.find({ resourceType: 'Company' });
    expect(resources.length).toBe(createCount - deleteCount);
});



test('update many', async () => {
    //arrange
    const createCount = 10;
    const updateCount = 3;
    const companies = [];
    for (let i = 0; i < createCount; i++) {
        const company = new Company({
            _id: new mongoose.Types.ObjectId(),
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD'),
        });
        companies.push(company);
    }

    await Company.insertMany(companies);

    //act

    const docs_to_update = [];
    for (let i = 0; i < updateCount; i++) {
        docs_to_update.push(companies.splice(casual.integer(0, companies.length - 1), 1)[0]);
    }

    await Company.updateMany({ _id: { $in: docs_to_update.map(c => c._id) } }, {
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    //assert
    const resources = await Resource.find({ resourceType: 'Company' });
    expect(resources.length).toBe(createCount);
});

test('update one', async () => {
    //arrange
    const createCount = 10;
    const updateCount = 1;
    const companies = [];

    for (let i = 0; i < createCount; i++) {
        const company = new Company({
            _id: new mongoose.Types.ObjectId(),
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD'),
        });
        companies.push(company);
    }

    await Company.insertMany(companies);

    //act
    const docs_to_update = companies.splice(casual.integer(0, companies.length - 1), 1);

    await Company.updateOne({ _id: docs_to_update[0]._id }, {
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    //assert
    const resources = await Resource.find({ resourceType: 'Company' });
    expect(resources.length).toBe(createCount);
});

