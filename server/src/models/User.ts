import { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    _id: { type: String }, // e.g. "usr_12345"
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    activeAccountId: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    _id: false,
    versionKey: false,
    collection: "users",
  }
);

UserSchema.index({ email: 1 });

export interface UserDoc {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  activeAccountId?: string;
  createdAt: string;
  [key: string]: any;
}

export const UserModel = model<UserDoc>("User", UserSchema);
export const User = UserModel;
export default UserModel;
