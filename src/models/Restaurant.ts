import mongoose, { Schema, Document, InferSchemaType } from "mongoose";


//  Restaurant Schema
export interface IRestaurant extends Document {
  name: string;
  description: string;
  address: string;
  estimatedDeliveryTime: number;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  openingHours:  string; // Improved Opening Hours
  cuisineType: string[];
  owner: mongoose.Types.ObjectId;
  imageUrl: string;
  menuItems: mongoose.Types.ObjectId[]; // Reference instead of embedding
  deliveryPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

//  Restaurant Schema
const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    estimatedDeliveryTime: { type: Number, required: true },
    deliveryPrice: { type: Number, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true, unique: true }, //  Unique phone
    email: { type: String, required: true, unique: true }, //  Unique email
    website: { type: String },
    openingHours: {type: String}, // Better opening hours format
    cuisineType: { type: [String], required: true },
    menuItems: [{ type: Schema.Types.ObjectId, ref: 'MenuItems' }], // Reference instead of embedding
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    imageUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;
