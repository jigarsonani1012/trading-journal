import { Schema, model, Document } from "mongoose";

const JournalPreSchema = new Schema(
  {
    expectations: { type: String, default: "" },
    levels: { type: String, default: "" },
    bias: { type: String, default: "" },
    plan: { type: String, default: "" },
    rulesFocus: { type: String, default: "" },
    riskLimit: { type: String, default: "" },
  },
  { _id: false }
);

const JournalPostSchema = new Schema(
  {
    happened: { type: String, default: "" },
    well: { type: String, default: "" },
    poorly: { type: String, default: "" },
    learned: { type: String, default: "" },
    changes: { type: String, default: "" },
  },
  { _id: false }
);

const JournalWeeklySchema = new Schema(
  {
    wins: { type: String, default: "" },
    problems: { type: String, default: "" },
    patterns: { type: String, default: "" },
    lessons: { type: String, default: "" },
    focus: { type: String, default: "" },
  },
  { _id: false }
);

const JournalSchema = new Schema(
  {
    _id: { type: String },
    date: { type: String, required: true }, // YYYY-MM-DD
    kind: { type: String, enum: ["daily", "weekly", "note"], required: true },
    pre: { type: JournalPreSchema, default: () => ({}) },
    post: { type: JournalPostSchema, default: () => ({}) },
    weekly: { type: JournalWeeklySchema },
    title: { type: String },
    body: { type: String },
    updatedAt: { type: String },
  },
  {
    _id: false,
    versionKey: false,
    collection: "journal",
  }
);

JournalSchema.index({ date: -1 });
JournalSchema.index({ kind: 1 });

export interface JournalDoc {
  _id: string;
  [key: string]: any;
}

export const JournalModel = model<JournalDoc>("Journal", JournalSchema);
export const Journal = JournalModel;
export default JournalModel;
