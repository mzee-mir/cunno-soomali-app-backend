import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["order", "promotion", "system", "restaurant"], 
    required: true 
  },
  relatedEntity: { 
    type: Schema.Types.ObjectId, 
    refPath: "relatedEntityModel" 
  },
  relatedEntityModel: {
    type: String,
    enum: ["Order", "Restaurant", "User"]
  },
  isDelivered: { type: Boolean, default: false },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;