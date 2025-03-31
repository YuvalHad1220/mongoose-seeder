// a class to create data for model

import type mongoose from "mongoose";
import type { FieldInitType, GeneratorModelType, ModelPropsType } from "./classTypes";
import Field from "./field";
import { getReptitions } from "./utils";
const DEFAULT_IGNORED_FIELDS = ["__v"];


function getSchema<T>(schema?: mongoose.Schema<T>, model?: mongoose.Model<T>){
    if (!(schema || model)){
        throw new Error("constructor must get either mongooseModel or mongooseSchema")
    }
    if (schema)
        return schema;
    return model!.schema
}

class Model<T extends object> {
    fieldsCache: Record<string, Field>;
    modelSettings: GeneratorModelType<T>["modelSettings"];
    fieldOptions: Partial<Record<keyof T, FieldInitType["options"]>>;
    mongooseSchema: mongoose.Schema<T>;
    modelsDataMap: Record<string, any[]>;


    constructor({ modelsDataMap, mongooseModel, mongooseSchema ,modelSettings, fieldOptions }: ModelPropsType<T>) {
        this.fieldsCache = {};
        this.modelSettings = modelSettings;
        this.fieldOptions = fieldOptions;
        this.mongooseSchema = getSchema(mongooseSchema, mongooseModel)
        this.modelsDataMap = modelsDataMap;
    }

    private _parseFields() {
        return this.mongooseSchema.paths;
    }

    private _getFieldsToIgnore() {
        return this.modelSettings.fieldsToIgnore || DEFAULT_IGNORED_FIELDS
    }

    private createOrGetFieldObject(fieldId: string, field: mongoose.SchemaType<any, any>) {
        if (this.fieldsCache[fieldId])
            return this.fieldsCache[fieldId]

        const newField = new Field({
            modelsDataMap: this.modelsDataMap,
            fieldId,
            fieldType: field.instance,
            options: this.fieldOptions[fieldId as keyof T],
            _mongooseField: field
        })

        this.fieldsCache[fieldId] = newField;
        return newField;

    }


    private getFieldObject(fieldId: string) { return this.fieldsCache[fieldId] }

    private shouldCreateField(fieldId: string, partial: Partial<T>, ignoreProbability = false) {
        const fieldsToIgnore = this._getFieldsToIgnore()
        if (fieldsToIgnore.includes(fieldId) || (fieldId in partial))
            return false;

        if (ignoreProbability)
            return true;

        const fieldOptions = this.fieldOptions[fieldId as keyof T];
        if (fieldOptions?.probability !== undefined) {
            return fieldOptions.probability > Math.random()
        }

        return true;
    }
    _makeItemFields(partial: Partial<T> = {}, ignoreProbability = false): T {
        const fields = this._parseFields();

        for (const fieldId in fields) {
            const mongooseField = fields[fieldId];
            const fieldObject = this.createOrGetFieldObject(fieldId, mongooseField)
            this._makeItemField(fieldObject, partial, fieldId, ignoreProbability)

        }
        return partial as T;

    }

    _makeItemField(fieldObject: Field, partial: Partial<T>, fieldId: string, ignoreProbability: boolean) {
        if (!this.shouldCreateField(fieldId, partial, ignoreProbability))
            return;
        const randomValue = fieldObject.generateField();
        partial[fieldId as keyof T] = randomValue;
    }

    generateModelData() {
        let items: T[] = [];

        if (this.modelSettings.mustInclude) {
            for (let partial of this.modelSettings.mustInclude) {
                const data = this._makeItemFields(partial);
                items.push(data);
            }
        }

        const repetitionCount = getReptitions(this.modelSettings.repetitions);
        for (let i = 0; i < repetitionCount; i++) {
            items.push(this._makeItemFields());
        }

        if (this.modelSettings.requiredOnCase) {
            for (let item of items) {
                const entries = Object.entries(this.modelSettings.requiredOnCase) as [
                    keyof T,
                    (dataModel: T) => boolean
                ][];

                for (let [possibleFieldId, requireFunc] of entries) {
                    const shouldForcecullyWriteField = requireFunc(item);

                    if (shouldForcecullyWriteField) {
                        const fieldObject = this.getFieldObject(possibleFieldId as string);
                        if (!fieldObject) {
                            console.log("no field object for", possibleFieldId)
                            continue
                        }
                        this._makeItemField(fieldObject, item, possibleFieldId as string, true)
                    }
                }
            }
        }

        // Timestamp modification
        for (let item of items) {
            if ("createdAt" in item && "updatedAt" in item) {
                // Ensure fields are Date objects
                const createdAt = item.createdAt instanceof Date ? item.createdAt : null;
                const updatedAt = item.updatedAt instanceof Date ? item.updatedAt : null;
                if (!createdAt || !updatedAt){
                    console.log("invalid created or updated at: ", item.createdAt, item.updatedAt, item)
                    continue;
                }

                // Use timestamps for comparison
                if (updatedAt< createdAt) {
                    // Swap timestamps
                    [item.updatedAt, item.createdAt] = [item.createdAt, item.updatedAt]
                }
            }
        }


        if (this.modelSettings.modify) {
            items = this.modelSettings.modify(items) ?? items
        }

        return items;

    }
}

export default Model;