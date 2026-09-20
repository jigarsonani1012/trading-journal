import { Schema, model, Document } from "mongoose";

const ColumnSchema = new Schema(
  {
    _id: { type: String },
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "text", "number", "currency", "percent", "date", "datetime",
        "dropdown", "multiselect", "checkbox", "formula", "rating",
      ],
      required: true,
    },
    options: { type: [String] },
    formula: { type: String },
    visible: { type: Boolean, default: true },
  },
  {
    _id: false,
    versionKey: false,
    collection: "columns",
  }
);

export interface ColumnDoc {
  _id: string;
  [key: string]: any;
}

export const ColumnModel = model<ColumnDoc>("Column", ColumnSchema);
export const Column = ColumnModel;
export default ColumnModel;
