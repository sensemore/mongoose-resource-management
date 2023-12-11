const Building = require('./building');
const Department = require('./department');
const Company = require('./company');
const Resource = require('./resource');
const resourceTypes = require('./resourceTypes');
require("dotenv").config();

const mrm = require('..');



async function main() {
    const mongoose = require('mongoose');

    await mongoose.connect(process.env.MONGODB_URI);
    //drop db
    for (const collection of Object.values(mongoose.connection.collections)) {
        await collection.drop();
    }

    mrm.setMongoose(mongoose);

    const company = new Company({
        name: 'Company 1',
        founded: '2020-01-01',
    });

    await company.save();

    const building = new Building({
        name: 'Building 1',
        adress: 'Adress 1',
        company: company._id
    });
    await building.save();

    const department = new Department({
        name: 'Department 1',
        building: building._id,
    })

    await department.save();

    const department2 = new Department({
        name: 'Department 2',
        building: null
    })

    await department2.save();

    console.log('done');

    const key = `/${resourceTypes.COMPANY}/${company._id.toString()}/${resourceTypes.BUILDING}/${building._id.toString()}`;

    console.log(await mrm.checkAccessByKeys(department, resourceTypes.DEPARTMENT, key));
    console.log(await mrm.checkAccessByKeys(department2, resourceTypes.DEPARTMENT, key));


    console.log(await Department.aggregate()
        .resourceFilter({
            resourceType: resourceTypes.DEPARTMENT,
            resourceKeys: [key]
        })
        .match({
            resource: {
                $exists: true
            }
        })
    );

}


main();