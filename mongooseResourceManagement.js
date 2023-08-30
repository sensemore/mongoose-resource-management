const mongoose = require('mongoose');
class ResourceManagement {

    constructor() {
        this.refField = "ref";
        this.pathField = "path";
        this.resourceTypeField = "resourceType";
        this.collection = "resources";
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

    configure({ refField, pathField, resourceTypeField,collection }) {
        this.refField = refField;
        this.pathField = pathField;
        this.resourceTypeField = resourceTypeField;
        this.collection = collection;
    }
    async getPath(document, resourceType, parentResource) {
        let path = `/${resourceType}/${document._id.toString()}`;

        if (parentResource) {
            let ref = document[parentResource.localField];

            let parentResourceDocument = await mongoose.connection.db.collection(this.collection).findOne({
                [this.refField]: ref,
                [this.resourceTypeField]: parentResource.resourceType
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

        schema.post('insertMany', async (docs) => {
            let resources = [];
            for (let doc of docs) {
                const path = await this.getPath(doc, resourceType, parent);
                resources.push({
                    [this.refField]: doc._id,
                    [this.resourceTypeField]: resourceType,
                    [this.pathField]: path
                });
            }
            await mongoose.connection.db.collection(this.collection).insertMany(resources);
        });

    }
}


module.exports = new ResourceManagement();