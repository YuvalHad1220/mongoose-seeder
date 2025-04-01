/*
In this example, we will generate GitHubRepo documents,
with Issue and CodeSchema as nested objects.

Firstly, we will need to generate random CodeReferences, Issues and only then we could generate the GitHubRepo model.
*/

import mongoose, { Schema } from 'mongoose';
import {Generator} from "../src/generator"
import { getRandomCount, getRandomElement } from '../src/utils';
import { optionsFromFunc } from '../src/classTypes';
// Define interface for CodeReference
interface ICodeReference {
  fileName: string;
  lines: [number, number]; // Tuple representing start and end lines
}

// Define interface for Issue
interface IIssue {
  issueDescription: string;
  codeReferences: ICodeReference[];
}

// Define the main Mongoose model interface for GitHubRepo
interface IGitHubRepo {
  name: string;
  latestCommitID: string;
  contributorEmails: string[];
  issues: IIssue[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema for CodeReference
const CodeReferenceSchema = new Schema<ICodeReference>({
  fileName: { type: String, required: true },
  lines: { 
    type: [Number], 
    required: true,
  }
});

// Schema for Issue
const IssueSchema = new Schema<IIssue>({
  issueDescription: { type: String, required: true },
  codeReferences: { type: [CodeReferenceSchema] }
});

// Main schema for GitHubRepo
const gitHubRepoSchema = new Schema<IGitHubRepo>({
  name: { type: String, required: true },
  latestCommitID: { type: String, required: true },
  contributorEmails: [{ type: String, required: true }],
  issues: { type: [IssueSchema], required: true },
}, { timestamps: true });

// Export the GitHubRepo model
const GitHubRepo = mongoose.model<IGitHubRepo>('GitHubRepo', gitHubRepoSchema);

const main = async () => {
    // init the model
    const seeder = new Generator("mongodb://debian:27017/Test-DB");
    await seeder.init()

    // now - to generate CodeRefernece.
    const crfs = seeder.generateHelper({
        modelId: "codereference",
        mongooseSchema: CodeReferenceSchema,
        modelSettings: {
            repetitions: 10
        },
        fieldOptions: {
            lines: {
                arrayOptions: {
                    repetitions: 2,
                    // each item in the array should be between 1 to 250
                    range: [1, 250]
                },
                // each array should be the correct value - i.e lines[0] should always be less then lines[1]
                modify: ((fieldValue: [number, number]) => {
                    if (fieldValue[0] > fieldValue[1]) {
                        [fieldValue[0], fieldValue[1]] = [fieldValue[1], fieldValue[0]];
                    }
                    return fieldValue;
                })
            },
            fileName: {
                modify: fieldValue => fieldValue + '.js'
            }
        }
    })

    // console.log(crfs)
    /*
    [
        {
            fileName: 'Makenna.js',
            lines: [ 129, 177 ],
            _id: new ObjectId('67ebb332c042320fd7c1248f')
        },
        {
            fileName: 'Alfredo.js',
            lines: [ 86, 140 ],
            _id: new ObjectId('67ebb332c042320fd7c12490')
        },
        {
            fileName: 'Alyce.js',
            lines: [ 81, 166 ],
            _id: new ObjectId('67ebb332c042320fd7c12491')
        },
        ...
    ]
    */


    // now to generate Issues

    const issues = seeder.generateHelper({
        modelId: "issues",
        mongooseSchema: IssueSchema,
        modelSettings: {
            repetitions: 1,
        },
        fieldOptions: {
            issueDescription: {
                range: [5, 15]
            },
            codeReferences: {
                arrayOptions: {
                    // we could also pass a function that returns an integer to get repetitions
                    repetitions: () => getRandomCount([0, 3]),
                    // option 1: we will use the internal data map that saves all the data generated, and access the codereferences by their modelid
                    dependsOn: (gendataMap) => gendataMap.codereference,
                    
                    // option 2: we will use an external data source
                    dependsOn: () => crfs,

                    // now we need to pass a function to handle the models. note that if we were to pass an object, or any other type - we could use those, as long as we return a value
                    options: ((cr: ICodeReference[]) => getRandomElement(cr)) as optionsFromFunc
                }
            }
        }
    })

    // console.dir(issues, {depth: null})
    /*
    [
        {
            issueDescription: 'Sierra Elmer Frederic Odie Nathen',
            codeReferences: [
            {
                fileName: 'Leonard.js',
                lines: [ 8, 233 ],
                _id: new ObjectId(...)
                }
            },
            {
                fileName: 'Dallas.js',
                lines: [ 173, 228 ],
                _id: new ObjectId(...)
            }
            ],
            _id: new ObjectId(...)
        }
    ]
    */


    // to our main model - GitHubRepo
    const ghr = seeder.generateModel<IGitHubRepo>({
        modelId: "githubrepo",
        mongooseModel: GitHubRepo,
        modelSettings: {
            repetitions: 3,
        },
        fieldOptions: {
            issues: {
                arrayOptions: {
                    repetitions: 1,
                    // option 1: we will use the internal data map that saves all the data generated, and access the codereferences by their modelid
                    dependsOn: (gendataMap) => gendataMap.issues,
                    
                    options: ((issues: IIssue[]) => getRandomElement(issues)) as optionsFromFunc
                }
            },
            contributorEmails: {
                arrayOptions: {
                    repetitions: 5,
                    stringType: "email",
                    ensureUnique: true
                }
            }
            
        }
    })

    // console.dir(ghr, {depth: null})
    /*
    [
        {
            name: 'Jamie',
            latestCommitID: 'Eliseo',
            contributorEmails: [
            'Adan87@hotmail.com',
            'Kristopher75@gmail.com',
            'Michael.Bechtelar55@gmail.com',
            'German_Ratke@gmail.com',
            'Braden25@hotmail.com'
            ],
            issues: [
            {
                issueDescription: 'Ronaldo Constantin Wilburn Estefania Dorothea Daron Lennie Jerrell',
                codeReferences: [
                {
                    fileName: 'Rhea.js',
                    lines: [ 95, 159 ],
                    _id:new ObjectId(...), 
                    },
                {
                    fileName: 'Khalid.js',
                    lines: [ 83, 170 ],
                    _id: new ObjectId(...),
                    },
                {
                    fileName: 'Randy.js',
                    lines: [ 116, 202 ],
                    _id: new ObjectId(...),
                ],
                _id: new ObjectId(...),
            ],
            _id: new ObjectId(...),
            createdAt: 2023-07-31T09:09:48.183Z,
            updatedAt: 2024-11-19T05:03:44.746Z
        },
        {
            name: 'Granville',
            latestCommitID: 'Tyreek',
            contributorEmails: [
            'Ethel61@hotmail.com',
            'Thomas.DuBuque@hotmail.com',
            'Eliseo.Ebert94@gmail.com',
            'Irving_Effertz80@yahoo.com',
            'Vinnie71@hotmail.com'
            ],
            issues: [
            {
                issueDescription: 'Ronaldo Constantin Wilburn Estefania Dorothea Daron Lennie Jerrell',
                codeReferences: [
                {
                    fileName: 'Rhea.js',
                    lines: [ 95, 159 ],
                    _id: new ObjectId(...)
                },
                {
                    fileName: 'Khalid.js',
                    lines: [ 83, 170 ],
                    _id: new ObjectId(...)
                },
                {
                    fileName: 'Randy.js',
                    lines: [ 116, 202 ],
                    _id: new ObjectId(...)
                }
                ],
                _id: new ObjectId(...)
            }
            ],
            _id: new ObjectId(...),
            createdAt: 2024-02-16T06:04:37.243Z,
            updatedAt: 2024-08-02T07:15:25.830Z
        },
        ...
    ]
    */

    await seeder.flush() // will save only the model, not the helpers into the db; it will delete all internal references to the model data
    await seeder.close()
}


main()