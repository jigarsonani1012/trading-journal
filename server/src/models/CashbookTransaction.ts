import { Schema, model } from "mongoose";

const CashbookTransactionSchema = new Schema(
  {
    _id: { type: String }, // e.g. "tx_12345"
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    note: { type: String, default: "" },
    paymentMethod: { type: String, default: "Bank Transfer" },
    linkedTradingAccountId: { type: String }, // for trading payouts / deposits
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    _id: false,
    versionKey: false,
    collection: "cashbook_transactions",
  }
);

CashbookTransactionSchema.index({ userId: 1, date: -1 });
CashbookTransactionSchema.index({ userId: 1, type: 1 });
CashbookTransactionSchema.index({ userId: 1, category: 1 });

export interface CashbookTransactionDoc {
  _id: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note?: string;
  paymentMethod?: string;
  linkedTradingAccountId?: string;
  createdAt: string;
  [key: string]: any;
}

export const CashbookTransactionModel = model<CashbookTransactionDoc>("CashbookTransaction", CashbookTransactionSchema);
export const CashbookTransaction = CashbookTransactionModel;
export default CashbookTransactionModel;
