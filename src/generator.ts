import mongoose from "mongoose";
import type { GeneratorModelType, GeneratorOptions } from "./classTypes";
import Model from "./Model";

function logChunkInsertion(
  modelId: string,
  chunkLength: number,
  currentIndex: number,
  chunkSize: number,
  totalChunks: number
): void {
  if (totalChunks > 1) {
      console.log(
          `Flushed chunk ${Math.floor(currentIndex / chunkSize) + 1} of ${totalChunks} ` +
          `(${chunkLength} items) to model ${modelId}`
      );
  }
}

export class Generator {
  options: GeneratorOptions;
  connectionUrl: string;
  modelsDataMap: Record<string, any[]>;
  modelMapping: Record<string, mongoose.Model<any>>; // Map modelId to mongoose.Model

  constructor(connectionUrl: string, options: GeneratorOptions = {deleteCollections: true, insertionChunkSize: 5000, maxParallelInsertionOps: 15}) {
    if (options.deleteCollections === undefined || options.deleteCollections === null || options.insertionChunkSize === undefined || options.insertionChunkSize === null){
      throw new Error("options for generator are missing required fields")
    }
    this.options = options;
    this.modelsDataMap = {};
    this.modelMapping = {}; // Initialize the mapping
    this.connectionUrl = connectionUrl;
  }

  private ensureConnected(): void {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      throw new Error("Not connected to MongoDB or database handle is unavailable.");
    }
  }
  

  registerModel(modelId: string, mongooseModel: mongoose.Model<any>): void {
    this.modelMapping[modelId] = mongooseModel;
  }

  private cleanup(modelId: string) {
    delete this.modelMapping[modelId]
    delete this.modelsDataMap[modelId]
  }

  async flush(): Promise<void> {
    this.ensureConnected();
    
    try {
        await this.processAllModels();
        console.log("Flush completed successfully.");
    } catch (error) {
        console.error("Error during flush:", error);
        throw new Error("Failed to flush data to MongoDB");
    }
}

private async processAllModels(): Promise<void> {
  const entries = Object.entries(this.modelsDataMap);
  
  // Process in batches of MAX_CONCURRENCY
  for (let i = 0; i < entries.length; i += this.options.maxParallelInsertionOps) {
    const batch = entries.slice(i, i + this.options.maxParallelInsertionOps);
    const batchPromises = batch.map(([modelId, data]) => this.processModel(modelId, data));
    await Promise.all(batchPromises);
  }
}

private async processModel(modelId: string, data: any[]): Promise<void> {
    const model = this.modelMapping[modelId];
    if (!this.validateModel(model)) return;

    if (!data?.length) return;

    await this.flushModelData(model, modelId, data);
    this.cleanup(modelId);
}

private validateModel(model: any): boolean {
    if (!model) {
        return false;
    }
    return true;
}

private async flushModelData(model: any, modelId: string, data: any[]): Promise<void> {
    if (this.options.deleteCollections) {
        await this.clearCollection(model);
    }

    const chunkSize = this.options.insertionChunkSize;
    const totalChunks = Math.ceil(data.length / chunkSize);

    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await model.insertMany(chunk);
        if (totalChunks > 1)
          logChunkInsertion(modelId, chunk.length, i, chunkSize, totalChunks);
    }

    console.log(`Flushed ${data.length} items to model ${modelId}`);
}

private async clearCollection(model: any): Promise<void> {
    await model.deleteMany();
}


  async tapInto<T>({ modelId, collectionName }: { modelId: string; collectionName: string }): Promise<void> {
    this.ensureConnected()
  
    try {
      // Check if the collection exists
      const collections = await mongoose.connection.db!.listCollections().toArray();
      const collectionNames = collections.map(col => col.name);
  
      if (!collectionNames.includes(collectionName)) {
        throw new Error(`Collection '${collectionName}' does not exist in the database.`);
      }
  
      // Fetch data from the collection
      const collData = await mongoose.connection.db!.collection(collectionName)!.find().toArray() as T[];
  
      // Handle empty collections or unexpected data
      if (!collData.length) {
        console.warn(`Warning: Collection '${collectionName}' is empty.`);
      }
      this.modelsDataMap[modelId] = collData;
  
    } catch (error) {
      console.error(`Failed to tap into collection '${collectionName}':`, error);
      throw new Error(`Error accessing the collection '${collectionName}': ${error}`);
    }
  }
  
  async init(): Promise<void> {
    try {
      await mongoose.connect(this.connectionUrl);
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      throw new Error("Failed to connect to MongoDB");
    }
  }

  generateHelper<T extends object>({
    modelId,
    mongooseSchema,
    modelSettings,
    fieldOptions,
  }: GeneratorModelType<T>): T[] {

    if (!mongooseSchema){
      throw new Error("missing mongoose schema")
    }

    const newModel = new Model({ modelsDataMap: this.modelsDataMap, modelSettings, mongooseSchema, fieldOptions: fieldOptions ?? {} });

    const modelData = newModel.generateModelData();
    
    this.modelsDataMap[modelId] = modelData;
    return modelData
  }
  generateModel<T extends object>({
    modelId,
    mongooseModel,
    modelSettings,
    fieldOptions,
  }: GeneratorModelType<T>): T[] {

    if (!mongooseModel){
      throw new Error("Missing mongoose model")
    }

    this.modelMapping[modelId] = mongooseModel;
    return this.generateHelper({modelId, mongooseSchema: mongooseModel.schema, modelSettings, fieldOptions})

  }

  getModelsData(): Record<string, any[]> {
    return this.modelsDataMap;
  }

  async close(): Promise<void> {
    try {
      await mongoose.connection.close();
      console.log("Connection closed");
    } catch (error) {
      console.error("Error closing connection:", error);
      throw new Error("Failed to close MongoDB connection");
    }
  }
}

