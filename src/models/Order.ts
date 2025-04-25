import { ref } from "joi";
import mongoose, { Schema } from "mongoose";

const orderSchema = new mongoose.Schema({
  restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant" },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  address : { type : Schema.Types.ObjectId, ref : 'address' },
  deliveryDetails: {
    email: { type: String, required: true },
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
  },
  cartItems: [
    {
      menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItems' },
      quantity: { type: Number, required: true },
      name: { type: String, required: true },
      imageUrl: { type: String, required: true },
      price: { type: Number, required: true },
    },
  ],
  totalAmount: {type:Number, required : true},
  status: {
    type: String,
    enum: ["placed", "paid", "inProgress", "outForDelivery", "delivered"],
  },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
export default Order;