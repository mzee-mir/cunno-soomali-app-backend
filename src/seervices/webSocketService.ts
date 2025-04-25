import http from 'http';
import Notification from '../models/Notification';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';

interface ActiveConnection {
  userId: string;
  ws: WebSocket;
}

let activeConnections: ActiveConnection[] = [];

const pendingNotifications: Map<string, any[]> = new Map();
const notificationTimers: Map<string, NodeJS.Timeout> = new Map();

const DEBOUNCE_DELAY_MS = 1500

export const initializeWebSocketServer = (server: http.Server) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws, req) => {
    try {
      // 1. Parse token from URL
      const parsedUrl = new URL(req.url || '', `http://${req.headers.host}`);
      const token = parsedUrl.searchParams.get('token');

      if (!token) {
        ws.close();
        return;
      }

      // 2. Decode token
      const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN || '') as { userId: string };
      const userId = decoded.userId;

      // 3. Remove any previous connection for this user (if only one allowed)
      activeConnections = activeConnections.filter(conn => conn.userId !== userId);
      activeConnections.push({ userId, ws });

      // 4. On disconnect, clean up
      const cleanUp = () => {
        activeConnections = activeConnections.filter(conn => conn.ws !== ws);
      };
      ws.on('close', cleanUp);
      ws.on('error', cleanUp);

      // 5. Keep-alive ping
      const interval = setInterval(() => {
        if (ws.readyState !== ws.OPEN) {
          clearInterval(interval);
          ws.terminate();
        } else {
          ws.ping();
        }
      }, 30000);
      ws.on('close', () => clearInterval(interval));

      // 6. Send any undelivered notifications
      try {
        const undelivered = await Notification.find({ user: userId, isDelivered: false }).sort({ createdAt: 1 });

        if (undelivered.length > 0) {
          ws.send(JSON.stringify({
            type: 'notification_batch',
            data: undelivered,
          }));

          const ids = undelivered.map(n => n._id);
          await Notification.updateMany(
            { _id: { $in: ids } },
            { $set: { isDelivered: true } }
          );
        }
      } catch (error) {
        console.error('Failed to send undelivered notifications:', error);
      }

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close();
    }
  });
};


export const sendNotificationToUser = async (userId: string, notification: any) => {
  // Add the notification to the pending queue
  const current = pendingNotifications.get(userId) || [];
  pendingNotifications.set(userId, [...current, notification]);

  // If a timer already exists, do nothing (it will send all pending notifications soon)
  if (notificationTimers.has(userId)) return;

  // Otherwise, create a timer to send after debounce delay
  const timer = setTimeout(() => {
    const notificationsToSend = pendingNotifications.get(userId) || [];
    pendingNotifications.delete(userId);
    notificationTimers.delete(userId);

    const connections = activeConnections.filter(conn => conn.userId === userId);
    
    for (const connection of connections) {
      if (connection.ws.readyState === connection.ws.OPEN) {
        connection.ws.send(JSON.stringify({
          type: 'notification_batch',
          data: notificationsToSend,
        }));
      }
    }
  }, DEBOUNCE_DELAY_MS);

  notificationTimers.set(userId, timer);
};


export const broadcastNotification = async (notification: any) => {
  for (const connection of activeConnections) {
    if (connection.ws.readyState === connection.ws.OPEN) {
      connection.ws.send(JSON.stringify({
        type: 'notification',
        data: notification,
      }));
    }
  }
};
