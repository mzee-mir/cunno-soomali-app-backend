// MenuItems.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  restaurant: mongoose.Types.ObjectId;
  name: string;
  stock: boolean;
  price: number;
  imageUrl: string;
  discount: number | null;
  description: string;
  publish: boolean;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: mongoose.Types.ObjectId | null;
  restoredAt: Date | null;
  restoredBy: mongoose.Types.ObjectId | null;
}

const menuItemSchema = new Schema<IMenuItem>({
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
  name: { type: String, required: true },
  stock: { type: Boolean, default: true },
  price: { type: Number, required: true },
  imageUrl: { type: String, default: "" },
  discount: { type: Number, default: null },
  description: { type: String, default: "" },
  publish: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  restoredAt: { type: Date, default: null },
  restoredBy: { type: Schema.Types.ObjectId, ref: "User", default: null }
}, { timestamps: true });

const MenuItems = mongoose.model<IMenuItem>("MenuItems", menuItemSchema);
export default MenuItems;