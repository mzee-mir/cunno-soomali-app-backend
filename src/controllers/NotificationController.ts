import { Request, Response } from "express";
import Notification from "../models/Notification";
import mongoose from "mongoose";
import authentications from "../middleware/authentications";


// 🔹 Get Notifications (w/ pagination, filter)
const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, type } = req.query;

    const filter: any = { user: userId };
    if (type) filter.type = type;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    res.status(200).json({ success: true, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Mark a single notification as read
const markAsRead = async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Mark all notifications as read
const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Get unread count
const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const count = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    res.status(200).json({ success: true, data: { count } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔹 Create and return a notification (used internally)
const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  relatedEntity?: mongoose.Types.ObjectId,
  relatedEntityModel?: string
) => {
  const notification = new Notification({
    user: userId,
    title,
    message,
    type,
    ...(relatedEntity && { relatedEntity }),
    ...(relatedEntityModel && { relatedEntityModel })
  });

  await notification.save();
  return notification;
};

// 🔹 (Optional) Mark notification as delivered
const markAsDelivered = async (notificationId: string) => {
  await Notification.findByIdAndUpdate(notificationId, { isDelivered: true });
};

  // 🔹 Delete a specific notification
  const deleteNotification = async (req: Request, res: Response) => {
    console.log("DELETE route hit for ID:", req.params.notificationId);
    try {
      const { notificationId } = req.params;
      const userId = req.userId;
  
      const deleted = await Notification.findOneAndDelete({
        _id: notificationId,
        user: userId
      });
  
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Notification not found"
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Notification deleted"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Error deleting notification"
      });
    }
  };

// 🔹 Delete all read notifications
const deleteAllReadNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    await Notification.deleteMany({ user: userId, isRead: true });

    res.status(200).json({
      success: true,
      message: "All read notifications deleted"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting read notifications"
    });
  }
};


export default {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  getUnreadCount,
  deleteNotification,
  deleteAllReadNotifications,
  markAsDelivered
};