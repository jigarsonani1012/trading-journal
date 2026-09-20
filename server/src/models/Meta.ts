import { Schema, model, Document } from "mongoose";

// Singleton — tracks whether demo seed has been applied
const MetaSchema = new Schema(
  {
    _id: { type: String, default: "singleton" },
    seeded: { type: Boolean, default: false },
    seededAt: { type: String },
  },
  {
    _id: false,
    versionKey: false,
    collection: "meta",
  }
);

export interface MetaDoc {
  _id: string;
  seeded: boolean;
  seededAt: string;
}

export const MetaModel = model<MetaDoc>("Meta", MetaSchema);
export const Meta = MetaModel;
export default MetaModel;
