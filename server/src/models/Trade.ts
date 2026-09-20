import { Schema, model, Document } from "mongoose";

// ── Sub-schema: RuleReview ──────────────────────────────────────────────────
const RuleReviewSchema = new Schema(
  {
    ruleId: { type: String, required: true },
    status: { type: String, enum: ["FOLLOWED", "BROKEN"], required: true },
    why: { type: String },
    whatHappened: { type: String },
    lesson: { type: String },
    change: { type: String },
  },
  { _id: false }
);

// ── Main Trade schema ────────────────────────────────────────────────────────
const TradeSchema = new Schema(
  {
    _id: { type: String }, // use app-generated ID (e.g. "T1001")
    symbol: { type: String, required: true, trim: true },
    market: { type: String, required: true },
    side: { type: String, enum: ["LONG", "SHORT"], required: true },
    quantity: { type: Number, required: true },
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number, required: true },
    entryTime: { type: String, required: true },
    exitTime: { type: String, required: true },
    stopLoss: { type: Number },
    takeProfit: { type: Number },
    riskAmount: { type: Number, default: 0 },
    riskPercent: { type: Number, default: 0 },
    plannedRR: { type: Number },
    grossPnL: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    netPnL: { type: Number, default: 0 },
    rMultiple: { type: Number, default: 0 },
    holdingMinutes: { type: Number, default: 0 },
    setup: { type: String, default: "" },
    strategy: { type: String, default: "" },
    timeframe: { type: String, default: "" },
    session: { type: String, default: "" },
    htfBias: {
      type: String,
      enum: ["Bullish", "Bearish", "Neutral"],
      default: "Neutral",
    },
    marketCondition: { type: String, default: "" },
    entryModel: { type: String },
    exitModel: { type: String },
    entryReason: { type: String },
    exitReason: { type: String },
    emotion: { type: String, default: "" },
    confidence: { type: Number, min: 1, max: 5, default: 3 },
    mistake: { type: String },
    grade: { type: String, enum: ["A", "B", "C", "D", ""], default: "" },
    ruleStatus: {
      type: String,
      enum: ["FOLLOWED", "BROKEN"],
      default: "FOLLOWED",
    },
    ruleReviews: { type: [RuleReviewSchema], default: [] },
    notes: { type: String },
    screenshots: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    customFields: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  {
    _id: false, // we manage _id ourselves
    versionKey: false,
    collection: "trades",
  }
);

TradeSchema.index({ exitTime: -1 });
TradeSchema.index({ symbol: 1 });
TradeSchema.index({ netPnL: 1 });

export interface TradeDoc {
  _id: string;
  [key: string]: any;
}

export const TradeModel = model<TradeDoc>("Trade", TradeSchema);
export const Trade = TradeModel;
export default TradeModel;
