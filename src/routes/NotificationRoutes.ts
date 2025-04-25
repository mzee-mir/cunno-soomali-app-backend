import express from 'express';
import NotificationController from '../controllers/NotificationController';
import authentications from '../middleware/authentications';

const router = express.Router();



// Make sure these routes match exactly what the frontend is calling
router.get("/", authentications, NotificationController.getNotifications);
router.patch("/:notificationId/read", authentications, NotificationController.markAsRead);
router.patch("/read-all", authentications, NotificationController.markAllAsRead);
router.get("/unread-count", authentications, NotificationController.getUnreadCount);
router.delete("/:notificationId", authentications, NotificationController.deleteNotification);
router.delete("/read/all", authentications, NotificationController.deleteAllReadNotifications);

console.log("Notification routes loaded");

export default router;