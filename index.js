let config = {
    refField: "ref",
    pathField: "path",
    resourceTypeField: "resourceType",
    collection: "resources",
    users: {
        refCollection: "users",
        refField: "_id",
        userResources: "userResources",

    },
    mongoose: require('mongoose')
};



function deepMerge(target, source) {
    if (typeof target !== "object" || target === null) {
        return source;
    }

    if (typeof source !== "object" || source === null) {
        return target;
    }

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const targetValue = target[key];
            const sourceValue = source[key];

            if (Object.prototype.hasOwnProperty.call(target, key) &&
                typeof targetValue === "object" &&
                typeof sourceValue === "object") {
                target[key] = deepMerge(targetValue, sourceValue);
            } else {
                target[key] = sourceValue;
            }
        }
    }

    return target;
}


function configure({ refField, pathField, resourceTypeField, collection, users }) {
    let newConfig = {
        refField,
        pathField,
        resourceTypeField,
        collection,
        users
    }
    config = deepMerge(config, newConfig);
    setSearchFilter();
}


async function checkAccessByKeys(document, resourceType, keys) {
    if (!Array.isArray(keys)) {
        keys = [keys]
    }
    const resource = await getResource(document._id, resourceType, keys);
    if (!resource) {
        return false;
    }
    return true;
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
    let keyRegex = {
        "$regexMatch": {
            "input": "$path",
            "regex": new RegExp(`^${keys.join('|')}`)
        }
    };


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
                            { $eq: [`$${config.resourceTypeField}`, resourceType] },
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
        [config.refField]: new config.mongoose.Types.ObjectId(ref),
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
        if (parentResourceDocument) {
            path = `${parentResourceDocument[config.pathField]}${path}`;
        } else if (!parentResource.optional) {
            throw new Error(`parent resource not found for ${resourceType}`);
        }
    }
    return path;
}

function registerResource({
    schema,
    resourceType,
    parent // { resourceType, localField, optional }
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
    recreateResources,
    checkAccessByKeys
};