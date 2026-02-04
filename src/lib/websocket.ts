// WebSocket Real-Time Service

export type WebSocketEvent =
  // Room events
  | 'room_state'
  | 'viewer_count_update'
  | 'user_joined'
  | 'user_left'
  | 'connected'
  // Chat events
  | 'chat_message'
  | 'chat_deleted'
  // Gift events
  | 'gift_sent'
  | 'big_gift_queue_update'
  | 'leaderboard_update'
  // Battle events
  | 'battle_invite'
  | 'battle_accepted'
  | 'battle_declined'
  | 'battle_started'
  | 'battle_score_update'
  | 'battle_ended'
  | 'booster_activated'
  // Moderation events
  | 'user_muted'
  | 'user_kicked'
  | 'user_banned';

export interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
  timestamp: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners = new Map<WebSocketEvent, Set<(data: any) => void>>();
  private roomId: string | null = null;

  connect(roomId: string, token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.roomId = roomId;
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    this.ws = new WebSocket(`${wsUrl}/live/${roomId}?token=${token}`);

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected to room:', roomId);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      this.attemptReconnect();
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomId = null;
    this.reconnectAttempts = 0;
  }

  send(event: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data, timestamp: new Date().toISOString() }));
    } else {
      console.warn('[WebSocket] Cannot send - not connected');
    }
  }

  on(event: WebSocketEvent, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: WebSocketEvent, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private handleMessage(message: WebSocketMessage) {
    const listeners = this.listeners.get(message.event);
    if (listeners) {
      listeners.forEach(callback => callback(message.data));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      if (this.roomId) {
        this.connect(this.roomId, ''); // Token should be refreshed
      }
    }, delay);
  }
}

export const websocket = new WebSocketService();
