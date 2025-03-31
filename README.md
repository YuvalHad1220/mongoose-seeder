# Mongoose Seeder

An open-source script for generating MongoDB documents based on Mongoose schemas and models.

## Installation

```sh
npm i @yuvalhad1220/mongoose-seeder
```

## Usage

### Basic Setup

```typescript
import mongoose, { Schema, model } from "mongoose";
import { MongooseSeeder } from "@yuvalhad1220/mongoose-seeder";
const mongoUri = "mongodb://localhost:27017/test";
const seeder = new MongooseSeeder(mongoUri);
await seeder.init();
type UserType = {
    _id?: mongoose.Types.ObjectId;
    name?: string;
    lname: string;
};
const userSchema = new Schema<UserType>({
    name: String,
    lname: String
});
const User = model<UserType>("User", userSchema);
```

---

### Generate Users

```typescript
const users = seeder.generateModel({
    modelId: "users",
    mongooseModel: User,
    modelSettings: {
        repetitions: 40,
    },
});
console.log(users.length === 40); // true
console.log(users[0]); 
/*
{
    _id: new mongoose.Types.ObjectId("..."),
    name: "John",
    lname: "Doe"
}
*/
```

---

### Modify Entire Model List In-Place

```typescript
const users = seeder.generateModel({
    modelId: "users",
    mongooseModel: User,
    modelSettings: {
        repetitions: 40,
        modify: modelData => {
            // Option 1: Modify the existing array in-place
            modelData.forEach(user => user.name = "general_modification");
            
            // Option 2: Return a new array to replace modelData
            return modelData.map(user => ({
                ...user,
                name: "replacement_data"
            }));
        }
    },
});
// If using Option 1:
console.log(users.every(user => user.name === "general_modification")); // true
// If using Option 2:
console.log(users.every(user => user.name === "replacement_data")); // true
```

---

### Use a Fixed List of Names

```typescript
const users = seeder.generateModel({
    modelId: "users",
    mongooseModel: User,
    modelSettings: {
        repetitions: 5,
    },
    fieldOptions: {
        name: {
            options: ["Alice", "Bob", "Charlie", "David", "Eve"]
        }
    }
});
// Each user will have a name randomly selected from the options array
console.log(["Alice", "Bob", "Charlie", "David", "Eve"].includes(users[0].name)); // true
```

---

### Probability-Based Field Inclusion

```typescript
const users = seeder.generateModel({
    modelId: "users",
    mongooseModel: User,
    modelSettings: {
        repetitions: 1,
    },
    fieldOptions: {
        name: {
            probability: 0
        }
    }
});
console.log(users[0].name === undefined); // true
```

---

### Assign Different Field Types

```typescript
const users = seeder.generateModel({
    modelId: "users",
    mongooseModel: User,
    modelSettings: {
        repetitions: 1,
    },
    fieldOptions: {
        name: {
            treatFieldAs: "Number",
        }
    }
});
console.log(typeof users[0].name === "number"); // true
```

---

### Generate Data with Dependent Model Values

Mongoose Seeder allows you to use previously generated models to seed new ones.

```typescript
// First, define our models
type UserType = {
    _id?: mongoose.Types.ObjectId;
    name?: string;
    email?: string;
};

type PlaceType = {
    _id?: mongoose.Types.ObjectId;
    name: string;
    address: string;
};

type GroupType = {
    _id?: mongoose.Types.ObjectId;
    name: string;
    users: mongoose.Types.ObjectId[];
    meetingPlace?: mongoose.Types.ObjectId;
};

// Create and seed the models in order
const users = seeder.generateModel({
    modelId: "users",
    mongooseModel: User,
    modelSettings: {
        repetitions: 20,
    },
});

const places = seeder.generateModel({
    modelId: "places",
    mongooseModel: Place,
    modelSettings: {
        repetitions: 5,
    },
});

// Now generate groups that depend on both users and places
const groups = seeder.generateModel({
    modelId: "groups",
    mongooseModel: Group,
    modelSettings: {
        repetitions: 1,
    },
    fieldOptions: {
        // Example 1: Array field depending on users
        users: {
            arrayOptions: {
                repetitions: 5,
                // Access multiple generated models using gdm object
                dependsOn: gdm => gdm.users;
                // Use the accessed models in the options function
                options: ((users: UserType[]) => getRandomElement(users)!._id!) as optionsFromFunc
            }
        },
        // Example 2: Simple field depending on places
        meetingPlace: {
            // Access multiple generated models
            dependsOn: gdm => gdm.places;
                // Use the accessed models in the options function
			options: ((places: PlaceType[]) => getRandomElement(places)!._id!) as optionsFromFunc
        }
    }
});

console.log(groups[0].users.length === 5); // true
console.log(groups[0].users.every(userId => userId instanceof mongoose.Types.ObjectId)); // true
console.log(groups[0].meetingPlace instanceof mongoose.Types.ObjectId); // true
```

---

## License

MIT License
