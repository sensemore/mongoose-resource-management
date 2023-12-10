const config = {
    refField: "ref",
    pathField: "path",
    resourceTypeField: "resourceType",
    collection: "resources",
    mongoose: require('mongoose')
};

function configure({ refField, pathField, resourceTypeField, collection }) {
    config.refField = refField;
    config.pathField = pathField;
    config.resourceTypeField = resourceTypeField;
    config.collection = collection;
    setSearchFilter();

}

function setMongoose(mongoose) {
    config.mongoose = mongoose;
    setSearchFilter();
}
function setSearchFilter() {
    config.mongoose.Aggregate.prototype.resourceFilter = function ({ resourceType, resourceKeys }) {
        this.pipeline().push(...getResourceFilters(resourceType, resourceKeys));
        return this;
    };
}

function getResourceFilters(resourceType, keys) {
    let keyRegex = keys.map(x => {
        return {
            "$regexMatch": {
                "input": "$path",
                "regex": new RegExp(`^${x}`)
            }
        };

    });

    let stages = [{
        $lookup: {
            from: "resources",
            let: { ref: "$_id" },
            as: "resource",
            pipeline: [{
                $match: {
                    $expr: {
                        $and: [
                            { $eq: ["$ref", "$$ref"] },
                            { $eq: ["$resourceType", resourceType] },
                            { $or: keyRegex }

                        ]
                    }
                }
            }]

        }
    },
    { $unwind: { path: "$resource", preserveNullAndEmptyArrays: true } }//we dont care if resource is not found it may slow down the query significantly
    ];

    return stages;
}

async function recreateResources({ model, resourceType, parent }) {
    //get parents
    if (!resourceType) {
        throw new Error("resourceType is required");
    }
    return model.find().cursor().eachAsync(async doc => {
        let resources = [];
        const path = await getPath(doc, resourceType, parent);
        resources.push({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType,
            [config.pathField]: path
        });
        await config.mongoose.connection.collection(config.collection).updateOne({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType
        }, {
            $set: {
                [config.refField]: doc._id,
                [config.resourceTypeField]: resourceType,
                [config.pathField]: path
            }
        }, { upsert: true });
    })
}

async function getResource(ref, resourceType, keys) {
    let resource = await config.mongoose.connection.collection(config.collection).findOne({
        [config.refField]: ref,
        [config.resourceTypeField]: resourceType
    });
    if (!resource) {
        return null;
    }
    if (keys.some(key => new RegExp(`^${key}`).test(resource[config.pathField]))) {
        return resource;
    }
    return null;
}

async function getPath(document, resourceType, parentResource) {
    let path = `/${resourceType}/${document._id.toString()}`;

    if (parentResource) {
        let ref = document[parentResource.localField];

        let parentResourceDocument = await config.mongoose.connection.collection(config.collection).findOne({
            [config.refField]: ref,
            [config.resourceTypeField]: parentResource.resourceType
        });
        if (!parentResourceDocument && !parentResource.optional) {
            throw new Error(`parent resource not found for ${resourceType}`);
        } else {
            path = `${parentResourceDocument[config.pathField]}${path}`;
        }
    }
    return path;
}

function registerResource({
    schema,
    resourceType,
    parent // { resourceType, localField }
}) {

    schema.post('insertMany', async (docs) => {
        let resources = [];
        for (let doc of docs) {
            const path = await getPath(doc, resourceType, parent);
            resources.push({
                [config.refField]: doc._id,
                [config.resourceTypeField]: resourceType,
                [config.pathField]: path
            });
        }
        await config.mongoose.connection.collection(config.collection).insertMany(resources);
    });

    schema.post('save', async (doc) => {
        const path = await getPath(doc, resourceType, parent);
        await config.mongoose.connection.collection(config.collection).updateOne({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType
        }, {
            $set: {
                [config.refField]: doc._id,
                [config.resourceTypeField]: resourceType,
                [config.pathField]: path
            }
        }, { upsert: true });
    });

    schema.post('findOneAndUpdate', async function () {
        const doc = await this.model.findOne(this.getQuery());
        if (!doc) {
            return;
        }
        const path = await getPath(doc, resourceType, parent);
        await config.mongoose.connection.collection(config.collection).updateOne({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType
        }, {
            $set: {
                [config.refField]: doc._id,
                [config.resourceTypeField]: resourceType,
                [config.pathField]: path
            }
        }, { upsert: true });
    });

    schema.pre('findOneAndRemove', async function () {
        const doc = await this.model.findOne(this.getQuery());
        if (!doc) {
            return;
        }
        await config.mongoose.connection.collection(config.collection).deleteOne({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType
        });
    });

    schema.pre('findOneAndDelete', async function () {
        const doc = await this.model.findOne(this.getQuery());
        if (!doc) {
            return;
        }
        await config.mongoose.connection.collection(config.collection).deleteOne({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType
        });
    });

    schema.pre('deleteOne', async function () {
        const doc = await this.model.findOne(this.getQuery());
        if (!doc) {
            return;
        }
        await config.mongoose.connection.collection(config.collection).deleteOne({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType
        });
    });

    schema.pre('deleteMany', async function () {
        const docs = await this.model.find(this.getQuery(), { _id: 1 });
        if (!docs) {
            return;
        }
        for (let doc of docs) {
            await config.mongoose.connection.collection(config.collection).deleteOne({
                [config.refField]: doc._id,
                [config.resourceTypeField]: resourceType
            });
        }
    });

    schema.pre('updateOne', async function () {
        const doc = await this.model.findOne(this.getQuery());
        if (!doc) {
            return;
        }
        const path = await getPath(doc, resourceType, parent);
        await config.mongoose.connection.collection(config.collection).updateOne({
            [config.refField]: doc._id,
            [config.resourceTypeField]: resourceType
        }, {
            $set: {
                [config.refField]: doc._id,
                [config.resourceTypeField]: resourceType,
                [config.pathField]: path
            }
        }, { upsert: true });
    });

    schema.pre('updateMany', async function () {
        const docs = await this.model.find(this.getQuery());
        if (!docs) {
            return;
        }
        for (let doc of docs) {
            const path = await getPath(doc, resourceType, parent);
            await config.mongoose.connection.collection(config.collection).updateOne({
                [config.refField]: doc._id,
                [config.resourceTypeField]: resourceType
            }, {
                $set: {
                    [config.refField]: doc._id,
                    [config.resourceTypeField]: resourceType,
                    [config.pathField]: path
                }
            }, { upsert: true });
        }
    });
}


module.exports = {
    configure,
    setMongoose,
    getResourceFilters,
    getResource,
    getPath,
    registerResource,
    recreateResources
};