/**
 * API Endpoint: Send Push Notification
 * POST /api/send-notification
 * Used for sending push notifications to users
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { userId, title, body, data, imageUrl }: NotificationRequest = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's device tokens
    const { data: tokens, error } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No active device tokens found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send notifications based on platform
    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        if (token.platform === 'ios') {
          return sendAPNS(token.token, title, body, data, imageUrl);
        } else if (token.platform === 'android') {
          return sendFCM(token.token, title, body, data, imageUrl);
        } else if (token.platform === 'web') {
          return sendWebPush(token.token, title, body, data, imageUrl);
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: tokens.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Send notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Send notification via Apple Push Notification Service (APNs)
 */
async function sendAPNS(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  imageUrl?: string
) {
  // Use a library like node-apn or make direct HTTP/2 request
  // Example: https://developer.apple.com/documentation/usernotifications/sending_notification_requests_to_apns

  const payload = {
    aps: {
      alert: { title, body },
      sound: 'default',
      badge: 1,
      'mutable-content': imageUrl ? 1 : 0,
    },
    data: data || {},
    imageUrl,
  };

  // Implementation would use APNs HTTP/2 API with your APNs auth key
  console.log('Sending APNS notification:', payload);
  
  // Placeholder - implement with actual APNs library
  return Promise.resolve();
}

/**
 * Send notification via Firebase Cloud Messaging (FCM)
 */
async function sendFCM(
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  imageUrl?: string
) {
  const fcmUrl = 'https://fcm.googleapis.com/fcm/send';
  
  const payload = {
    to: deviceToken,
    notification: {
      title,
      body,
      image: imageUrl,
      sound: 'default',
    },
    data: data || {},
    priority: 'high',
  };

  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${process.env.FCM_SERVER_KEY}`, // Set in .env
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`FCM error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Send web push notification
 */
async function sendWebPush(
  subscription: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  imageUrl?: string
) {
  // Use web-push library for sending web push notifications
  // Example: https://www.npmjs.com/package/web-push

  const payload = JSON.stringify({
    title,
    body,
    icon: '/apple-touch-icon.svg',
    image: imageUrl,
    data: data || {},
  });

  // Placeholder - implement with actual web-push library
  console.log('Sending web push notification:', payload);
  
  return Promise.resolve();
}
