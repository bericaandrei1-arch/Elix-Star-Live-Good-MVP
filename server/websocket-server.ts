// WebSocket Server for Real-Time Features
// Run with: npm run ws:server

import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.WS_PORT || 8080;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Client {
  ws: WebSocket;
  userId: string;
  roomId: string;
  username: string;
}

const rooms = new Map<string, Set<Client>>();
const clients = new Map<WebSocket, Client>();

const wss = new WebSocketServer({ port: Number(PORT) });

console.log(`WebSocket server started on port ${PORT}`);

wss.on('connection', async (ws: WebSocket, req) => {
  console.log('New connection');

  // Parse room and token from URL
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room');
  const token = url.searchParams.get('token');

  if (!roomId || !token) {
    ws.close(1008, 'Missing room or token');
    return;
  }

  // Verify token and get user
  const { data: userData, error } = await supabase.auth.getUser(token);

  if (error || !userData.user) {
    ws.close(1008, 'Invalid token');
    return;
  }

  // Get username
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', userData.user.id)
    .single();

  const client: Client = {
    ws,
    userId: userData.user.id,
    roomId,
    username: profile?.username || 'Anonymous',
  };

  clients.set(ws, client);

  // Add to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId)!.add(client);

  // Send welcome message
  sendToClient(client, 'connected', {
    room_id: roomId,
    user_count: rooms.get(roomId)!.size,
  });

  // Broadcast user joined
  broadcastToRoom(roomId, 'user_joined', {
    user_id: client.userId,
    username: client.username,
  }, client);

  // Update viewer count
  await updateViewerCount(roomId);

  // Handle messages
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      await handleMessage(client, message);
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  });

  // Handle disconnect
  ws.on('close', async () => {
    console.log('Client disconnected');

    const room = rooms.get(roomId);
    if (room) {
      room.delete(client);

      // Broadcast user left
      broadcastToRoom(roomId, 'user_left', {
        user_id: client.userId,
        username: client.username,
      });

      // Update viewer count
      await updateViewerCount(roomId);

      // Clean up empty rooms
      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }

    clients.delete(ws);
  });
});

async function handleMessage(client: Client, message: any) {
  const { event, data } = message;

  switch (event) {
    case 'chat_message':
      // Broadcast chat message to room
      broadcastToRoom(client.roomId, 'chat_message', {
        ...data,
        user_id: client.userId,
        username: client.username,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'gift_sent':
      // Broadcast gift to room
      broadcastToRoom(client.roomId, 'gift_sent', {
        ...data,
        user_id: client.userId,
        username: client.username,
        timestamp: new Date().toISOString(),
      });
      break;

    case 'battle_score_update':
      // Broadcast score update
      broadcastToRoom(client.roomId, 'battle_score_update', data);
      break;

    case 'booster_activated':
      // Broadcast booster activation
      broadcastToRoom(client.roomId, 'booster_activated', {
        ...data,
        user_id: client.userId,
      });
      break;

    case 'battle_invite':
      // Send to specific user (challenger)
      const targetRoom = data.challenger_stream_id;
      broadcastToRoom(targetRoom, 'battle_invite', data);
      break;

    case 'battle_accepted':
    case 'battle_declined':
      // Notify host
      const hostRoom = data.host_stream_id;
      broadcastToRoom(hostRoom, event, data);
      break;

    default:
      console.log('Unknown event:', event);
  }
}

function sendToClient(client: Client, event: string, data: any) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    }));
  }
}

function broadcastToRoom(roomId: string, event: string, data: any, exclude?: Client) {
  const room = rooms.get(roomId);
  if (!room) return;

  const message = JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });

  room.forEach(client => {
    if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

async function updateViewerCount(roomId: string) {
  const room = rooms.get(roomId);
  const count = room?.size || 0;

  // Update database
  await supabase
    .from('live_streams')
    .update({ viewer_count: count })
    .eq('id', roomId);

  // Broadcast to room
  broadcastToRoom(roomId, 'viewer_count_update', { count });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
