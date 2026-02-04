// Analytics Event Ingestion Endpoint

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side
);

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  user_id?: string;
  session_id: string;
  timestamp: string;
  platform: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: AnalyticsEvent = await req.json();

    // Validate required fields
    if (!body.event || !body.session_id) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Store in database (create analytics_events table if needed)
    const { error } = await supabase.from('analytics_events').insert({
      event: body.event,
      properties: body.properties,
      user_id: body.user_id,
      session_id: body.session_id,
      platform: body.platform,
      created_at: body.timestamp,
    });

    if (error) {
      console.error('Failed to store analytics event:', error);
      return new Response('Failed to store event', { status: 500 });
    }

    // Optionally forward to external analytics (PostHog, Firebase, etc.)
    // await forwardToPostHog(body);
    // await forwardToFirebase(body);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Optional: Forward to PostHog
async function forwardToPostHog(event: AnalyticsEvent) {
  if (!process.env.POSTHOG_API_KEY) return;

  try {
    await fetch('https://app.posthog.com/capture/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_API_KEY,
        event: event.event,
        properties: {
          ...event.properties,
          distinct_id: event.user_id || event.session_id,
          $session_id: event.session_id,
        },
        timestamp: event.timestamp,
      }),
    });
  } catch (error) {
    console.error('Failed to forward to PostHog:', error);
  }
}
