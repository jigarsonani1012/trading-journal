import { Schema, model, Document } from "mongoose";

const RuleSchema = new Schema(
  {
    _id: { type: String },
    order: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "" },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    active: { type: Boolean, default: true },
    createdAt: { type: String },
  },
  {
    _id: false,
    versionKey: false,
    collection: "rules",
  }
);

RuleSchema.index({ order: 1 });
RuleSchema.index({ category: 1 });

export interface RuleDoc {
  _id: string;
  [key: string]: any;
}

export const RuleModel = model<RuleDoc>("Rule", RuleSchema);
export const Rule = RuleModel;
export default RuleModel;
