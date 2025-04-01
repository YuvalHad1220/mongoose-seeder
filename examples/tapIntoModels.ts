/*
In this example, we will tapInto existing models, i.e - access models that already exist in the db.
That's a good option if we have data that is constant and shouldnt be re-generated
*/

import mongoose, { Schema } from 'mongoose';
import {Generator} from "../src/generator"
import { getRandomElement } from '../src/utils';
import { optionsFromFunc } from '../src/classTypes';

// that code ran somewhere, and it generated an "identifier" collection in our db
const runOnce = async () => {

    const identifierSchema = new Schema({
        type: "string"
    })

    const IdentifierModel = mongoose.model("Identifier", identifierSchema)

    // init the model
    const seeder = new Generator("mongodb://debian:27017/Test-DB");
    await seeder.init()

    const ids = seeder.generateModel({
        modelId: "identifier",
        mongooseModel: IdentifierModel,
        modelSettings: {
            repetitions: 0, // will not generate random data, at all
            
            // that field is an array that will always be generated and inserted
            mustInclude: [
                {type: "ID_A"},
                {type: "ID_B"},
                {type: "ID_C"},
            ]
        }
    })

    // console.log(ids)
    /*
    [
        { type: 'ID_A', _id: new ObjectId('67ebbc5bc6cd727685718fab') },
        { type: 'ID_B', _id: new ObjectId('67ebbc5bc6cd727685718fac') },
        { type: 'ID_C', _id: new ObjectId('67ebbc5bc6cd727685718fad') }
    ]
    */

    await seeder.flush()
    await seeder.close()

}

const main = async () => {

    const CarSchema = new Schema({
        serialnumber: String,
        identifierID: Schema.Types.ObjectId
    })

    const Car = mongoose.model("Car", CarSchema)

    // init the model
    const seeder = new Generator("mongodb://debian:27017/Test-DB");
    await seeder.init()


    // will load the model into the generator's datamap. 
    await seeder.tapInto({modelId: "identifier", collectionName: "identifiers"})

    const cars = seeder.generateModel({
        modelId: "car",
        mongooseModel: Car,
        modelSettings: {
            repetitions: 10,
        },
        fieldOptions: {
            identifierID: {
                dependsOn: genDataMap => genDataMap.identifier,
                options: ((identifiers: any[]) => getRandomElement(identifiers)!._id) as optionsFromFunc
            }
        }
    })


    // console.log(cars)
    /*
    [
        {
            serialnumber: 'Declan',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fac'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf6c')
        },
        {
            serialnumber: 'Carrie',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fab'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf6d')
        },
        {
            serialnumber: 'Cyril',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fad'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf6e')
        },
        {
            serialnumber: 'Elenor',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fab'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf6f')
        },
        {
            serialnumber: 'Jorge',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fad'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf70')
        },
        {
            serialnumber: 'Cory',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fab'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf71')
        },
        {
            serialnumber: 'Alexane',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fad'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf72')
        },
        {
            serialnumber: 'Ted',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fab'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf73')
        },
        {
            serialnumber: 'Aisha',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fac'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf74')
        },
        {
            serialnumber: 'Eli',
            identifierID: new ObjectId('67ebbc5bc6cd727685718fac'),
            _id: new ObjectId('67ebbec7ffe1cfb3db4baf75')
        }
    ]
    */
    // will save the cars into the db, and will delete all internal references to the model data
    await seeder.flush()
    await seeder.close()
}


main()