const mongoose = require('mongoose');
const Company = require('../examples/company');
const Building = require('../examples/building');
const Resource = require('../examples/resource');
const Department = require('../examples/department');
const casual = require('casual');
const resourceTypes = require('../examples/resourceTypes');
const mrm = require('..');
//pre test 
beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDB', { useNewUrlParser: true, useUnifiedTopology: true });
    await mongoose.connection.dropDatabase();

    mrm.configure({
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
    const path = `/${resourceTypes.COMPANY}/${company._id.toString()}`;

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: resourceTypes.COMPANY });
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
    const path = `/${resourceTypes.COMPANY}/${company._id.toString()}`;
    company.name = casual.company_name;
    await company.save();

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: resourceTypes.COMPANY });
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
    const resources = await Resource.find({ ref: company._id, resourceType: resourceTypes.COMPANY });
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

    const path = `/${resourceTypes.COMPANY}/${company._id.toString()}`;

    await Company.findOneAndUpdate({ _id: company._id }, { name: casual.company_name });

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: resourceTypes.COMPANY });
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
    const path = `/${resourceTypes.COMPANY}/${company._id.toString()}`;
    await Company.findOneAndUpdate({ this_field: "doesnt_exists" }, { name: casual.company_name });

    //assert
    const resources = await Resource.find({ ref: company._id, resourceType: resourceTypes.COMPANY });
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
    const resources = await Resource.find({ resourceType: resourceTypes.COMPANY });
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
    const resources = await Resource.find({ resourceType: resourceTypes.COMPANY });
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
    const resources = await Resource.find({ resourceType: resourceTypes.COMPANY });
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
    const resources = await Resource.find({ resourceType: resourceTypes.COMPANY });
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
    const resources = await Resource.find({ resourceType: resourceTypes.COMPANY });
    expect(resources.length).toBe(createCount);
});


test('save building', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });
    //act
    await company.save();

    const building = new Building({
        name: casual.company_name,
        adress: casual.address,
        company: company._id,
    });
    await building.save();

    const path = `/${resourceTypes.COMPANY}/${company._id.toString()}/${resourceTypes.BUILDING}/${building._id.toString()}`;

    //assert
    const resources = await Resource.find({ ref: building._id, resourceType: resourceTypes.BUILDING });
    expect(resources.length).toBe(1);
    expect(resources[0].path).toBe(path);
});

test('save building with changes', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });
    //act
    await company.save();

    const building = new Building({
        name: casual.company_name,
        adress: casual.address,
        company: company._id,
    });
    await building.save();

    const path = `/${resourceTypes.COMPANY}/${company._id.toString()}/${resourceTypes.BUILDING}/${building._id.toString()}`;

    building.name = casual.company_name;
    await building.save();

    //assert
    const resources = await Resource.find({ ref: building._id, resourceType: resourceTypes.BUILDING });
    expect(resources.length).toBe(1);
    expect(resources[0].path).toBe(path);
});

test('insert many buildings', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });
    //act
    await company.save();

    const buildings = [];
    const createcount = 10;
    for (let i = 0; i < createcount; i++) {
        buildings.push(new Building({
            name: casual.company_name,
            adress: casual.address,
            company: company._id,
        }));
    }

    await Building.insertMany(buildings);

    //assert
    const resources = await Resource.find({ resourceType: resourceTypes.BUILDING });
    expect(resources.length).toBe(createcount);
});


test('delete one building', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });
    //act
    await company.save();

    const buildings = [];
    const createcount = 10;
    for (let i = 0; i < createcount; i++) {
        buildings.push(new Building({
            name: casual.company_name,
            adress: casual.address,
            company: company._id,
        }));
    }

    await Building.insertMany(buildings);

    const building = buildings[casual.integer(0, buildings.length - 1)];
    await Building.deleteOne({ _id: building._id });

    //assert
    const resources = await Resource.find({ resourceType: resourceTypes.BUILDING });
    expect(resources.length).toBe(createcount - 1);
});


test('delete many buildings', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });
    //act
    await company.save();

    const buildings = [];
    const createcount = 10;
    for (let i = 0; i < createcount; i++) {
        buildings.push(new Building({
            name: casual.company_name,
            adress: casual.address,
            company: company._id,
        }));
    }

    await Building.insertMany(buildings);

    const deleteBuildings = [];
    const deletecount = 3;
    for (let i = 0; i < deletecount; i++) {
        deleteBuildings.push(buildings.splice(casual.integer(0, buildings.length - 1), 1)[0]);
    }

    await Building.deleteMany({ _id: { $in: deleteBuildings.map(c => c._id) } });

    //assert
    const resources = await Resource.find({ resourceType: resourceTypes.BUILDING });

    expect(resources.length).toBe(createcount - deletecount);

});

test('update many buildings', async () => {
    //arrange
    const company = new Company({
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });
    //act
    await company.save();

    const buildings = Array(10).fill().map(() => new Building({
        name: casual.company_name,
        adress: casual.address,
        company: company._id,
    }));

    await Building.insertMany(buildings);

    const docs_to_update = buildings.splice(0, 3);

    console.log(`Updating ${docs_to_update.length} buildings`);
    await Building.updateMany({ _id: { $in: docs_to_update.map(c => c._id) } }, {
        name: casual.company_name,
        adress: casual.address,
        company: company._id,
    });

    //assert
    const resources = await Resource.find({ resourceType: resourceTypes.BUILDING });
    console.log(`Found ${resources.length} buildings`);
    expect(resources.length).toBe(10);
});




test('search buildings', async () => {
    //arrange
    const company_count = 10;
    const building_count_per_company = 10;

    const companies = Array(company_count).fill().map(() => new Company({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    }));
    //should return only first companies buildings
    const keys = [`/${resourceTypes.COMPANY}/${companies[0]._id.toString()}`];

    await Company.insertMany(companies);

    const buildings = [];

    for (let i = 0; i < company_count; i++) {
        for (let j = 0; j < building_count_per_company; j++) {
            buildings.push(new Building({
                name: casual.company_name,
                adress: casual.address,
                company: companies[i]._id,
            }));
        }
    }

    await Building.insertMany(buildings);

    //act 

    const search = await Building.aggregate([
        {
            $match: {
                $and: [
                    { name: { $regex: ".*" } },
                    { adress: { $regex: ".*" } },
                    { company: { $in: companies.map(c => c._id) } },
                ]
            }
        },
        ...mrm.getResourceFilters(resourceTypes.BUILDING, keys),
    ]);

    //assert
    expect(search.length).toBe(building_count_per_company);

});


test('search buildings all', async () => {
    //arrange
    const company_count = 10;
    const building_count_per_company = 10;

    const companies = Array(company_count).fill().map(() => new Company({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    }));
    //should return all buildings
    const keys = [`/`];

    await Company.insertMany(companies);

    const buildings = [];

    for (let i = 0; i < company_count; i++) {
        for (let j = 0; j < building_count_per_company; j++) {
            buildings.push(new Building({
                name: casual.company_name,
                adress: casual.address,
                company: companies[i]._id,
            }));
        }
    }

    await Building.insertMany(buildings);

    //act 

    const search = await Building.aggregate([
        {
            $match: {
                $and: [
                    { name: { $regex: ".*" } },
                    { adress: { $regex: ".*" } },
                    { company: { $in: companies.map(c => c._id) } },
                ]
            }
        },
        ...mrm.getResourceFilters(resourceTypes.BUILDING, keys),

    ]);

    //assert
    expect(search.length).toBe(company_count * building_count_per_company);

});


test('get resource', async () => {

    //arrange
    //create company , building and department
    const company = new Company({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    await company.save();

    const building = new Building({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        adress: casual.address,
        company: company._id,
    });

    await building.save();

    const department = new Department({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        building: building._id,
    });

    await department.save();

    //act
    let keys = [
        '/not/exists',
        `/${resourceTypes.COMPANY}/${company._id.toString()}/${resourceTypes.BUILDING}/${building._id.toString()}/${resourceTypes.DEPARTMENT}/${department._id.toString()}`
];
    let resource = await mrm.getResource(department._id, resourceTypes.DEPARTMENT, keys);

    //assert
    expect(resource).not.toBe(null);
    expect(resource.ref).toEqual(department._id);
    expect(resource.resourceType).toEqual(resourceTypes.DEPARTMENT);
});



test('get resource as root', async () => {

    //arrange
    //create company , building and department
    const company = new Company({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    await company.save();

    const building = new Building({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        adress: casual.address,
        company: company._id,
    });

    await building.save();

    const department = new Department({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        building: building._id,
    });

    await department.save();

    //act
    let keys = [`/`];
    let resource = await mrm.getResource(department._id, resourceTypes.DEPARTMENT, keys);

    //assert
    expect(resource).not.toBe(null);
    expect(resource.ref).toEqual(department._id);
    expect(resource.resourceType).toEqual(resourceTypes.DEPARTMENT);
});


test('cant get resource', async () => {
    //arrange
    //create company , building and department
    const company = new Company({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        founded: casual.date('YYYY-MM-DD'),
    });

    await company.save();

    const building = new Building({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        adress: casual.address,
        company: company._id,
    });

    await building.save();

    const department = new Department({
        _id: new mongoose.Types.ObjectId(),
        name: casual.company_name,
        building: building._id,
    });

    await department.save();

    //act
    let keys = [`/not/exists`];
    let resource = await mrm.getResource(department._id, resourceTypes.DEPARTMENT, keys);

    //assert
    expect(resource).toBe(null);
});



test('recreate root resources', async () => {
    //arrange
    let companies = []
    
    for (let i = 0; i < 10; i++) {
        companies.push(new Company({
            _id: new mongoose.Types.ObjectId(),
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD'),
        }).toObject());
    }

    await mongoose.connection.db.collection(Company.collection.name).insertMany(companies);

    //act
    await mrm.recreateResources({
        model:Company,
        resourceType:resourceTypes.COMPANY,
        parent:null
    });

    //assert
    const resources = await Resource.find({ resourceType: resourceTypes.COMPANY });
    expect(resources.length).toBe(companies.length);

});

test('recreate resources', async () => {
    //arrange
    let companies = []
    for (let i = 0; i < 10; i++) {
        companies.push(new Company({
            _id: new mongoose.Types.ObjectId(),
            name: casual.company_name,
            founded: casual.date('YYYY-MM-DD')
        }));
    }
    await Company.insertMany(companies);

    let buildings = [];
    for (let i = 0; i < 100; i++) {
        buildings.push(new Building({
            _id: new mongoose.Types.ObjectId(),
            name: casual.company_name,
            adress: casual.address,
            company: companies[casual.integer(0, companies.length - 1)]._id,
        }).toObject());
    }

    await mongoose.connection.db.collection(Building.collection.name).insertMany(buildings);

    //act

    await mrm.recreateResources({
        model:Building,
        resourceType:resourceTypes.BUILDING,
        parent:{
            localField:"company",
            resourceType:resourceTypes.COMPANY
        }
    });

    //assert
    const resources = await Resource.find({ resourceType: resourceTypes.BUILDING });
    expect(resources.length).toBe(buildings.length);

});
