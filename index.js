const mongoose = require('mongoose');
class ResourceManagement {

    constructor() {
        this.refField = "ref";
        this.pathField = "path";
        this.resourceTypeField = "resourceType";
        this.collection = "resources";
    }
    getResourceFilters(resourceType, keys) {
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
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$ref", "$$ref"] },
                                    { $eq: ["$resourceType", resourceType] },
                                    { $or: keyRegex }

                                ]
                            }
                        }
                    }
                ]

            }
        },
        { $unwind: "$resource" },
        ];

        return stages;
    }
    async getResource(ref, resourceType, keys) {
        let resource = await mongoose.connection.db.collection(this.collection).findOne({
            [this.refField]: ref,
            [this.resourceTypeField]: resourceType
        });
        if (!resource) {
            return null;
        }
        if (keys.some(key => new RegExp(`^${key}`).test(resource[this.pathField]))) {
            return resource;
        }
        return null;
    }

    configure({ refField, pathField, resourceTypeField, collection }) {
        this.refField = refField;
        this.pathField = pathField;
        this.resourceTypeField = resourceTypeField;
        this.collection = collection;
    }
    async getPath(collection, refField, resourceTypeField, document, resourceType, parentResource) {
        let path = `/${resourceType}/${document._id.toString()}`;

        if (parentResource) {
            let ref = document[parentResource.localField];

            let parentResourceDocument = await mongoose.connection.db.collection(collection).findOne({
                [refField]: ref,
                [resourceTypeField]: parentResource.resourceType
            });
            if (!parentResourceDocument) {
                throw new Error(`parent resource not found for ${resourceType}`);
            }
            path = `${parentResourceDocument.path}${path}`;
        }
        return path;
    }
    registerResource({
        schema,
        resourceType,
        parent // { resourceType, localField }
    }) {

        let self = this;
        schema.post('insertMany', async (docs) => {
            let resources = [];
            for (let doc of docs) {
                const path = await self.getPath(self.collection, self.refField, self.resourceTypeField, doc, resourceType, parent);
                resources.push({
                    [self.refField]: doc._id,
                    [self.resourceTypeField]: resourceType,
                    [self.pathField]: path
                });
            }
            await mongoose.connection.db.collection(self.collection).insertMany(resources);
        });

        schema.post('save', async (doc) => {
            const path = await self.getPath(self.collection, self.refField, self.resourceTypeField, doc, resourceType, parent);
            await mongoose.connection.db.collection(self.collection).updateOne({
                [self.refField]: doc._id,
                [self.resourceTypeField]: resourceType
            }, {
                $set: {
                    [self.refField]: doc._id,
                    [self.resourceTypeField]: resourceType,
                    [self.pathField]: path
                }
            }, { upsert: true });
        });

        schema.post('findOneAndUpdate', async function () {
            const doc = await this.model.findOne(this.getQuery());
            if (!doc) {
                return;
            }
            const path = await self.getPath(self.collection, self.refField, self.resourceTypeField, doc, resourceType, parent);
            await mongoose.connection.db.collection(self.collection).updateOne({
                [self.refField]: doc._id,
                [self.resourceTypeField]: resourceType
            }, {
                $set: {
                    [self.refField]: doc._id,
                    [self.resourceTypeField]: resourceType,
                    [self.pathField]: path
                }
            }, { upsert: true });
        });

        schema.pre('findOneAndRemove', async function () {
            const doc = await this.model.findOne(this.getQuery());
            if (!doc) {
                return;
            }
            await mongoose.connection.db.collection(self.collection).deleteOne({
                [self.refField]: doc._id,
                [self.resourceTypeField]: resourceType
            });
        });

        schema.pre('findOneAndDelete', async function () {
            const doc = await this.model.findOne(this.getQuery());
            if (!doc) {
                return;
            }
            await mongoose.connection.db.collection(self.collection).deleteOne({
                [self.refField]: doc._id,
                [self.resourceTypeField]: resourceType
            });
        });

        schema.pre('deleteOne', async function () {
            const doc = await this.model.findOne(this.getQuery());
            if (!doc) {
                return;
            }
            await mongoose.connection.db.collection(self.collection).deleteOne({
                [self.refField]: doc._id,
                [self.resourceTypeField]: resourceType
            });
        });

        schema.pre('deleteMany', async function () {
            const docs = await this.model.find(this.getQuery(), { _id: 1 });
            if (!docs) {
                return;
            }
            for (let doc of docs) {
                let res = await mongoose.connection.db.collection(self.collection).deleteOne({
                    [self.refField]: doc._id,
                    [self.resourceTypeField]: resourceType
                });
            }
        });

        schema.pre('updateOne', async function () {
            const doc = await this.model.findOne(this.getQuery());
            if (!doc) {
                return;
            }
            const path = await self.getPath(self.collection, self.refField, self.resourceTypeField, doc, resourceType, parent);
            await mongoose.connection.db.collection(self.collection).updateOne({
                [self.refField]: doc._id,
                [self.resourceTypeField]: resourceType
            }, {
                $set: {
                    [self.refField]: doc._id,
                    [self.resourceTypeField]: resourceType,
                    [self.pathField]: path
                }
            }, { upsert: true });
        });

        schema.pre('updateMany', async function () {
            const docs = await this.model.find(this.getQuery());
            if (!docs) {
                return;
            }
            for (let doc of docs) {
                const path = await self.getPath(self.collection, self.refField, self.resourceTypeField, doc, resourceType, parent);
                await mongoose.connection.db.collection(self.collection).updateOne({
                    [self.refField]: doc._id,
                    [self.resourceTypeField]: resourceType
                }, {
                    $set: {
                        [self.refField]: doc._id,
                        [self.resourceTypeField]: resourceType,
                        [self.pathField]: path
                    }
                }, { upsert: true });
            }
        });
    }
}


module.exports = new ResourceManagement();