import { Schema, model } from "mongoose";

const BudgetSchema = new Schema(
  {
    _id: { type: String }, // e.g. "bgt_12345"
    userId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    monthlyLimit: { type: Number, required: true },
    monthYear: { type: String, required: true }, // e.g. "2026-09" or "default"
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    _id: false,
    versionKey: false,
    collection: "budgets",
  }
);

BudgetSchema.index({ userId: 1, category: 1, monthYear: 1 }, { unique: true });

export interface BudgetDoc {
  _id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  monthYear: string;
  createdAt: string;
  [key: string]: any;
}

export const BudgetModel = model<BudgetDoc>("Budget", BudgetSchema);
export const Budget = BudgetModel;
export default BudgetModel;
