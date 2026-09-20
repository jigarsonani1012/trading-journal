import { Schema, model, Document } from "mongoose";

const SavedViewSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    filters: { type: Schema.Types.Mixed, required: true },
  },
  {
    _id: false,
    versionKey: false,
    collection: "views",
  }
);

export interface ViewDoc {
  _id: string;
  [key: string]: any;
}

export const ViewModel = model<ViewDoc>("View", SavedViewSchema);
export const View = ViewModel;
export default ViewModel;
