import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: number;
  link?: string | null;
  createdAt: Date;
}

// Store connected admin clients
const adminClients = new Set<WebSocket>();

let wss: WebSocketServer | null = null;

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  if (wss) {
    console.log("[WebSocket] Server already initialized");
    return wss;
  }

  wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws/admin/notifications"
  });

  wss.on("connection", (ws: WebSocket, req) => {
    console.log("[WebSocket] Admin client connected");

    adminClients.add(ws);

    ws.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("[WebSocket] Received message:", data);
        
        // Handle ping/pong for connection health
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (err) {
        console.error("[WebSocket] Failed to parse message:", err);
      }
    });

    ws.on("close", () => {
      console.log("[WebSocket] Admin client disconnected");
      adminClients.delete(ws);
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Client error:", error);
      adminClients.delete(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connected",
      message: "Connected to admin notifications"
    }));
  });

  wss.on("error", (error) => {
    console.error("[WebSocket] Server error:", error);
  });

  console.log("[WebSocket] Server initialized at /ws/admin/notifications");
  return wss;
}

// Broadcast notification to all connected admin clients
export function broadcastNotification(notification: AdminNotification): void {
  if (!wss || adminClients.size === 0) {
    console.log("[WebSocket] No connected clients, skipping broadcast");
    return;
  }

  const payload = JSON.stringify({
    type: "notification",
    data: notification
  });

  let sentCount = 0;
  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sentCount++;
    }
  });

  console.log(`[WebSocket] Broadcast notification to ${sentCount} clients: ${notification.title}`);
}

// Broadcast custom message to all connected admin clients
export function broadcastMessage(type: string, data: unknown): void {
  if (!wss || adminClients.size === 0) {
    return;
  }

  const payload = JSON.stringify({ type, data });

  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Get count of connected clients
export function getConnectedClientsCount(): number {
  return adminClients.size;
}

// Close WebSocket server
export function closeWebSocketServer(): void {
  if (wss) {
    wss.close();
    wss = null;
    adminClients.clear();
    console.log("[WebSocket] Server closed");
  }
}
