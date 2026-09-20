import { Schema, model, Document } from "mongoose";

// Single-document collection (singleton pattern using a fixed _id)
const SettingsSchema = new Schema(
  {
    _id: { type: String, default: "singleton" },
    theme: { type: String, enum: ["dark", "light"], default: "dark" },
    currency: { type: String, default: "USD" },
    defaultRiskPercent: { type: Number, default: 1 },
    dateFormat: {
      type: String,
      enum: ["DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
      default: "DD MMM YYYY",
    },
    timeFormat: { type: String, enum: ["24h", "12h"], default: "24h" },
    timezone: { type: String, default: "UTC" },
    minSample: { type: Number, default: 20 },
    startingBalance: { type: Number, default: 25000 },
    overviewSections: { type: Schema.Types.Mixed, default: {} },
    sidebarCollapsed: { type: Boolean, default: false },
  },
  {
    _id: false,
    versionKey: false,
    collection: "settings",
  }
);

export interface SettingsDoc {
  _id: string;
  [key: string]: any;
}

export const SettingsModel = model<SettingsDoc>("Settings", SettingsSchema);
export const Settings = SettingsModel;
export default SettingsModel;
