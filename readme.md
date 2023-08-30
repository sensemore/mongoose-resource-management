
# Mongoose Resource Management(ABAC like)


A simple resource management system for mongoose.  
This is a work in progress.

Managing hierarcy of resources is a common problem in many applications. This module
provides a simple way to manage resources in a mongoose database. 

The idea is having a new collection to store resources. Each resource has a type,ref and  path.
The path is a string that represents the path of the resource in the hierarchy. You can see its almost like a file system.

The modulede injects middlewares(hooks) to keep resource collection updated.

While an Attribute-based access control(ABAC) systems offer rich mechanisims to implement authorization
this module does not cover all requirements of an ABAC. Its simple yet usefull and quite trivial to get starting.


## Defining a resource

```javascript
var mongoose = require('mongoose');
var mrm = require('mongoose-resource-management');

var buidlingSchema = new mongoose.Schema({
    address: String,
    name: String,
});

//it is important to register the resource before mongoose compiling the model 
//if you dont, the resource will not be created in the database
mrm.registerResource({
    buidlingSchema,
    resourceType: "building",
    parent: null, //indicates that this is a root resource
});

//now you can compile the model
var Building = mongoose.model('Building', buidlingSchema);


var roomSchema = new mongoose.Schema({
    name: String,
    building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
});

mrm.registerResource({
    roomSchema,
    resourceType: "room",
    parent: {
        localField: "building", //the field in the roomSchema that references the parent resource
        resourceType: "building", //the type of the parent resource
    }
});

var Room = mongoose.model('Room', roomSchema);

```

## Configuring the module

```javascript
var mongoose = require('mongoose');
var mrm = require('mongoose-resource-management');

//you can define whcih collection you would like to  use as resource collection
//its a good practice to create indexes for the fields ref and path
mrm.configure({
   refField: "ref",
   pathField: "path",
   resourceTypeField: "type",
   collection:"my_resources"
});
```

## Creating a resource

```javascript
var building = new Building({
    address: "123 Main St",
    name: "Main Building",
});

await building.save();
//this will create a resource in the resource collection as follows
/*
{
    _id: ObjectId("5f0b1b3b9b0b9b0b9b0b9b0b"),
    ref: ObjectId("5f0b1b3b9b0b9b0b9b0b9b0b"),
    path: "/building/5f0b1b3b9b0b9b0b9b0b9b0b",
    type: "building",
}
*/

var room = new Room({
    name: "Room 1",
    building: building._id,
});

await room.save();

//this will create a resource in the resource collection as follows

/*
{
    _id: ObjectId("5f0b1b3b9b0b9b0b9b0b9b0c"),
    ref: ObjectId("5f0b1b3b9b0b9b0b9b0b9b0c"),
    path: "/building/5f0b1b3b9b0b9b0b9b0b9b0b/room/5f0b1b3b9b0b9b0b9b0b9b0c",
    type: "room",
}
```


## Access Control

You can use the resource collection to manage access control to your resources. Storing resourceKeys in users session and checking them against the resource collection is a simple way to manage access control.

 It is a good practice to check resource access then continue with your logic. This way you can prevent users from accessing resources they dont have access to. For example you have an endpoint as `POST /room/5f0b1b3b9b0b9b0b9b0b9b0c/checkout` and you want to check if the user has access to this room before you continue with the checkout logic.
 
```javascript

const resourceKeys = [
    "/", // <--- This will give access to all resources
    "/building/5f0b1b3b9b0b9b0b9b0b9b0b", // <--- This will give access to all resources under this building
    "/building/5f0b1b3b9b0b9b0b9b0b9b0b/room/5f0b1b3b9b0b9b0b9b0b9b0c", // <--- This will give access to this room only
    "/building/5f0b1b3b9b0b9b0b9b0b9b0b/room" // <--- This will give access to all rooms under this building
]

const ref= ObjectId("5f0b1b3b9b0b9b0b9b0b9b0c"); //assume we are trying to access this room
const resource = mrm.getResource(ref,"room",resourceKeys); //this will return the resource if the user has access to it, otherwise it will return null

if(!resource){
    //user does not have access to this resource
    return;
}

//user has access to this resource you can continue with your logic


```

## Search

Search is one of the most complex operations when it comes to access control in a resource hierarchy.
Think about it, you wont return 403 for unauthorized search you just simply return empty array [].

This module provides a simple way to search resources in a hierarchy with helper functions.

Assume we are searching for rooms with name like `"ro"` in it. We want to search only in the resources that the user has access to.

```javascript
const resourceKeys = [
    "/building/5f0b1b3b9b0b9b0b9b0b9b0b/room" // <--- This will give access to all rooms under 5f0b1b3b9b0b9b0b9b0b9b0b building
]

Rooms.aggregate([{
    $match:{
        name: /ro/i
    },
    ...mrm.getResourceFilters("room",resourceKeys) //<-- this will return the filters that will limit the search to the resources that the user has access to
}])

```




## Deleting a resource

```javascript
await room.remove();
//this will delete the resource from the resource collection
```


## TODO

- [] CI for unit testing(should work inmemory mongodb)
- [] clearance like permit, allow, etc
- [] typescript 