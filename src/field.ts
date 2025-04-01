import { faker } from "@faker-js/faker";
import type { FieldInitType, fieldOptions } from "./classTypes";
import mongoose, { Types } from "mongoose";
import { getRandomElement, getRange, getReptitions } from "./utils";

class Field {
  fieldType: FieldInitType["fieldType"];
  fieldId: FieldInitType["fieldId"];
  options?: FieldInitType["options"];
  modelsDataMap: Record<string, any[]>; // Generic property
  _usedValues: Set<any>;
  _mongooseField: mongoose.SchemaType<any, any>;

  constructor(
    field: FieldInitType & {
      modelsDataMap: Record<string, any[]>;
      _mongooseField: mongoose.SchemaType<any, any>;
    }
  ) {
    this.options = field.options;
    this.fieldType = field.options?.treatFieldAs ?? field.fieldType;
    this.fieldId = field.fieldId;
    this.modelsDataMap = field.modelsDataMap;
    this._usedValues = new Set();
    this._mongooseField = field._mongooseField;
  }

  _getValueFromOption(fieldOption: fieldOptions){
    if (fieldOption.dependsOn){
      return this._getDependsOnValue(fieldOption)
    }
    return getRandomElement(fieldOption.options)

  }


  _generateArrayField(options?: FieldInitType["options"]): any[] {
    const value = [];
    const arrayType = (this._mongooseField as any).caster?.instance as string;
    const arrayOptions = options?.arrayOptions;
    if (!arrayOptions){
      console.log("No array options for field " + this.fieldId)
      return []
    }
    const itemsInArrayCount = getReptitions(arrayOptions!.repetitions);
    const userOptions = arrayOptions!.options;

    if (!(userOptions || arrayType)){
      throw new Error("Can't infer array type and there are no predefined options for field " + this.fieldId)
    }
    for (let i = 0; i < itemsInArrayCount; i++) {
      if (userOptions){
        value.push(this._getValueFromOption(arrayOptions))
      } else {
        value.push(this.generateField(arrayType, arrayOptions));
      }
    }

    return value;
  }

  generateField(fieldType?: string, options?: FieldInitType["options"],): any {
    if (!fieldType) fieldType = this.fieldType;
    if (!options) options = this.options;
    let value: any;
    let maxAttempts = 100; // Prevent infinite loops
    let attempts = 0;

    do {
      switch (fieldType) {
        case "Boolean": {
          value = faker.datatype.boolean()
          break;
        }
        case "Array": {
          value = this._generateArrayField(options);
          break;
        }
        case "ObjectId":
          value = this._generateObjectIdField(options)
          break;

        case "String":
          value = this._generateStringField(options);
          break;

        case "Date":
          value = this._generateDateField(options);
          break;

        case "Number":
          value = this._generateNumberField(options);
          break;

        default:
          console.warn(`Unsupported field type: ${fieldType}`, this.fieldId);
          return undefined; // Exit early for unsupported types
      }

      // Apply optional modification
      if (value !== undefined && options?.modify) {
        value = options.modify(value);
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.error(
          `Failed to generate a unique value for field type: ${this.fieldType} after ${maxAttempts} attempts.`,
          this.fieldId
        );
        return undefined; // Exit after max attempts
      }
    } while (
      value !== undefined &&
      options?.ensureUnique &&
      this._usedValues.has(value.toString())
    );

    if (options?.ensureUnique) this._usedValues.add(value.toString());
    return value;
  }

  private _generateObjectIdField(options: FieldInitType["options"]) {
    if (options?.options) {
      return this._getValueFromOption(options)
    }

    return new mongoose.Types.ObjectId()
  }
  private _getDependsOnValue(options: FieldInitType["options"]) {
    const customDataType = options!.dependsOn && options!.dependsOn(this.modelsDataMap);
    if (customDataType && typeof options!.options === "function") {
      return options!.options(customDataType);
    } else
      console.log(
        "You provided a dependsOn but options dependsOn id is invalid for " +
          this.fieldId
      );
  }

  // Generate a date field with an optional range
  private _generateDateField(options: FieldInitType["options"]): Date {
    const dependencyValue = options?.dependsOn && this._getDependsOnValue(options);
    if (dependencyValue) return dependencyValue as Date;
    if (options?.options){
      return this._getValueFromOption(options)
    }
    const [startDate, endDate] = getRange<Date>([new Date("2023-01-01"), new Date()], options?.range as [Date, Date])

    // Generate a random date within the specified range
    const randomDate = faker.date.between({ from: startDate, to: endDate });
    return randomDate;
  }

  // Generate a number field with an optional range
  private _generateNumberField(options: FieldInitType["options"]): number {
    if (options?.options){
      return this._getValueFromOption(options) as number
    }

    const [start, end] = getRange<number | undefined>([undefined, undefined], options?.range as [number, number])

    // Generate a random number within the specified range
    const randomNumber = faker.number.int({ min: start, max: end });
    return randomNumber;
  }

  private _generateStringField(options: FieldInitType["options"]): string {
    if (options?.options){
      return this._getValueFromOption(options)
    }
    // Handle different string type options
    switch (options?.stringType) {
      case "email":
        return faker.internet.email();
      default:
        const [minCount, maxCount] = getRange([1, 1], options?.range as [number, number])
        const nameCount = faker.number.int({ min: minCount, max: maxCount });
    
        return (
          Array.from({ length: nameCount }, () => faker.person.firstName()).join(" ") ||
          "Faker-Failed"
        );
    }
  }
}

export default Field;
