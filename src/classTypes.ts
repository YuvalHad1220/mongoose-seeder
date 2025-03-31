import type mongoose from "mongoose";

type dateRangeType = readonly [Date, Date];
type numberRangeType = readonly [number, number];
export type optionsFromFunc = <T>(model: T) => any;

export type fieldOptions = {
  probability?: number;
  options?: (Date | string | number)[] | optionsFromFunc;
  dependsOn?: (genDataMap: Record<string, any>) => any;
  stringType?: "email";
  ensureUnique?: boolean;
  treatFieldAs?: string;
  range?: dateRangeType | numberRangeType;
  modify?: (fieldValue: any) => any;
};
export type FieldInitType = {
  fieldType: string;
  fieldId: string;
  options?: {
    arrayOptions?: fieldOptions & {
      repetitions: number | (() => number);
    };
  } & fieldOptions;
};

export type GeneratorModelType<T> = {
  modelId: string;
  mongooseModel?: mongoose.Model<T>;
  mongooseSchema?: mongoose.Schema<T>;
  modelSettings: {
    requiredOnCase?: Partial<Record<keyof T, (dataModel: T) => boolean>>;
    modify?: (modelData: T[]) => void | T[];
    mustInclude?: Partial<T>[];
    timestampRequired?: boolean;
    fieldsToIgnore?: string[];
    repetitions: number | (() => number);
  };
  fieldOptions?: Partial<Record<keyof T, FieldInitType["options"]>>;
};

export type ModelPropsType<T> = {
    modelsDataMap: Record<string, any[]>;
    mongooseModel?: mongoose.Model<T>;
    mongooseSchema?: mongoose.Schema<T>;
    modelSettings: GeneratorModelType<T>["modelSettings"];
    fieldOptions: Partial<Record<keyof T, FieldInitType["options"]>>;
};

export type GeneratorOptions = {
  deleteCollections: boolean;
  insertionChunkSize: number;
  maxParallelInsertionOps: number;
  };
