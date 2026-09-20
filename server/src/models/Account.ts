import { Schema, model } from "mongoose";

const AccountSchema = new Schema(
  {
    _id: { type: String }, // e.g. "acc_12345"
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    broker: { type: String, default: "" },
    currency: { type: String, enum: ["USD", "INR", "EUR", "GBP"], default: "USD" },
    startingBalance: { type: Number, default: 25000 },
    defaultRiskPercent: { type: Number, default: 1.0 },
    color: { type: String, default: "#3b82f6" }, // hex color tag for UI
    isDefault: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    _id: false,
    versionKey: false,
    collection: "accounts",
  }
);

AccountSchema.index({ userId: 1, isDefault: 1 });

export interface AccountDoc {
  _id: string;
  userId: string;
  name: string;
  broker?: string;
  currency: "USD" | "INR" | "EUR" | "GBP";
  startingBalance: number;
  defaultRiskPercent: number;
  color: string;
  isDefault: boolean;
  createdAt: string;
  [key: string]: any;
}

export const AccountModel = model<AccountDoc>("Account", AccountSchema);
export const Account = AccountModel;
export default AccountModel;
