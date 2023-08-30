const mongoose = require('mongoose');
const feed = require('./feed');
const mongooseResourceManagement = require('./mongooseResourceManagement');



async function connectDb() {
    return new Promise((resolve, reject) => {
        mongoose.connect('mongodb://localhost:27017/firstDB', { useNewUrlParser: true, useUnifiedTopology: true });


        const db = mongoose.connection;
        db.on('error', console.error.bind(console, 'connection error:'));
        db.once('open', function () {
            console.log("Connection Successful!");
            return resolve();
        });
    });
}


async function main() {



    await connectDb();

    mongooseResourceManagement.configure({
        refField: "ref",
        pathField: "path",
        resourceTypeField: "resourceType",
    });

    //drop everything
    await mongoose.connection.dropDatabase();
    await feed({
        companySize: 10,
        buildingSize: 100,
        departmentSize: 1000,
        employeeSize: 10000,
    });

    console.log("Done!");


}



main();