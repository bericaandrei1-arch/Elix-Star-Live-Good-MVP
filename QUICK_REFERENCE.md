# Quick Reference Guide - Elix Star MVP

## 🎯 Common Tasks

### Track an Event
```typescript
import { trackEvent } from './lib/analytics';

trackEvent('video_like', { video_id: '123', from_feed: true });
```

### Credit User Wallet
```sql
SELECT credit_wallet(
  'user-uuid',           -- user_id
  'coins',               -- currency ('coins' or 'diamonds')
  1000,                  -- amount
  'purchase',            -- reference_type
  'purchase-uuid'        -- reference_id (optional)
);
```

### Debit User Wallet
```sql
SELECT debit_wallet(
  'user-uuid',
  'coins',
  50,
  'gift_sent',
  'gift-uuid'
);
```

### Send WebSocket Message
```typescript
import { websocket } from './lib/websocket';

// Connect to room
websocket.connect('stream-id', 'auth-token');

// Send event
websocket.send('chat_message', {
  message: 'Hello!',
  user_id: 'user-123',
});

// Listen for events
websocket.on('gift_sent', (data) => {
  console.log('Gift received:', data);
});
```

### Create Notification
```sql
SELECT create_notification(
  'recipient-user-id',   -- user_id
  'like',                -- type
  'actor-user-id',       -- actor_id
  'video',               -- target_type
  'video-id',            -- target_id
  'liked your video',    -- title
  NULL,                  -- body (optional)
  '/video/123'           -- action_url (optional)
);
```

### Upload Video
```typescript
import { videoUploadService } from './lib/videoUpload';

videoUploadService.onProgress((progress) => {
  console.log(`${progress.stage}: ${progress.progress}%`);
});

const videoId = await videoUploadService.uploadVideo(
  file,
  userId,
  {
    description: 'My awesome video! #trending #fun',
    hashtags: ['trending', 'fun'],
    isPrivate: false,
  }
);
```

### Generate Personalized Feed
```typescript
import { generatePersonalizedFeed } from './lib/feedAlgorithm';

const videoIds = await generatePersonalizedFeed(userId, 50);
```

### Update Page Meta
```typescript
import { updatePageMeta } from './lib/seo';

updatePageMeta({
  title: 'My Video Title',
  description: 'Watch this amazing video!',
  image: 'https://cdn.example.com/thumbnail.jpg',
  url: 'https://elixstar.live/video/123',
  type: 'video.other',
});
```

### Check Rate Limit
```typescript
import { checkRateLimit } from '../api/rate-limit';

const result = checkRateLimit(userId, 'video_upload');

if (!result.allowed) {
  alert(`Please wait ${result.retryAfter} seconds`);
  return;
}
```

### Activate Battle Booster
```sql
SELECT activate_booster(
  'user-uuid',      -- user_id
  'battle-uuid',    -- battle_id
  'booster-uuid'    -- booster_id
);
-- Returns success/failure with error message if failed
```

---

## 📁 File Structure

```
src/
├── components/           # Reusable UI components
│   ├── CommentsDrawer.tsx
│   ├── ShareSheet.tsx
│   ├── LiveBattleUI.tsx
│   ├── LiveChat.tsx
│   ├── GiftAnimationOverlay.tsx
│   ├── WalletBalance.tsx
│   ├── VideoActionMenu.tsx
│   ├── BattleInviteModal.tsx
│   ├── BattleNotification.tsx
│   ├── LoadingStates.tsx
│   └── ErrorBoundary.tsx
├── pages/                # Page components
│   ├── Inbox.tsx
│   ├── Discover.tsx
│   ├── Settings.tsx
│   ├── EditProfile.tsx
│   ├── PurchaseCoins.tsx
│   ├── Report.tsx
│   ├── Support.tsx
│   ├── Hashtag.tsx
│   ├── Guidelines.tsx
│   ├── settings/
│   │   ├── BlockedAccounts.tsx
│   │   └── SafetyCenter.tsx
│   └── admin/
│       ├── Dashboard.tsx
│       ├── Users.tsx
│       ├── Reports.tsx
│       └── Economy.tsx
├── lib/                  # Services and utilities
│   ├── analytics.ts      # Event tracking
│   ├── websocket.ts      # Real-time communication
│   ├── deepLinks.ts      # Deep link handling
│   ├── notifications.ts  # Push notifications
│   ├── videoPreloader.ts # Video preloading
│   ├── videoUpload.ts    # Upload pipeline
│   ├── feedAlgorithm.ts  # Personalization
│   └── seo.ts            # Meta tags
├── api/                  # Backend endpoints
│   ├── analytics.ts      # Analytics ingestion
│   └── rate-limit.ts     # Rate limiting
└── server/               # Backend services
    └── websocket-server.ts

supabase/migrations/
├── 20260204_wallet_ledger_system.sql
├── 20260204_comments_system.sql
├── 20260204_blocks_and_moderation.sql
├── 20260204_boosters_system.sql
├── 20260204_purchases_verification.sql
├── 20260204_trending_and_discovery.sql
├── 20260204_inbox_messages.sql
├── 20260204_device_tokens.sql
└── 20260204_analytics_events.sql
```

---

## 🔑 Key TypeScript Interfaces

### Video
```typescript
interface Video {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string;
  description: string;
  duration: number;
  is_private: boolean;
  views_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
}
```

### Battle
```typescript
interface Battle {
  id: string;
  host_stream_id: string;
  challenger_stream_id: string;
  status: 'pending' | 'active' | 'completed';
  host_score: number;
  challenger_score: number;
  time_limit_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  winner_id: string | null;
}
```

### Wallet Transaction
```typescript
interface WalletLedgerEntry {
  id: string;
  user_id: string;
  currency: 'coins' | 'diamonds';
  type: 'credit' | 'debit';
  amount: number;
  reference_type: 'purchase' | 'gift_sent' | 'gift_received' | 'refund' | 'adjustment' | 'battle_reward';
  reference_id: string | null;
  balance_after: number;
  metadata: Record<string, any>;
  created_at: string;
}
```

### Notification
```typescript
interface Notification {
  id: string;
  user_id: string;
  type: 'like' | 'comment' | 'follow' | 'gift' | 'battle_invite' | 'system';
  actor_id: string | null;
  target_type: 'video' | 'comment' | 'live_stream' | 'user' | null;
  target_id: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}
```

---

## 🎨 Theme Colors

```css
Primary Gold: #E6B36A
Secondary Gold: #B8935C
Background: #000000
Text: #FFFFFF
Success: #10B981
Error: #EF4444
Warning: #F59E0B
Info: #3B82F6
```

---

## 🔐 Admin Role Check

```typescript
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .single();

const isAdmin = data?.role === 'admin';
const isModerator = data?.role === 'moderator' || isAdmin;
```

---

## 📱 Deep Link Examples

```typescript
// Video
const link = generateDeepLink('video', 'video-uuid');
// Result: elixstar://video/video-uuid

// User profile
const link = generateDeepLink('user', 'username');
// Result: elixstar://user/username

// Live stream
const link = generateDeepLink('live', 'stream-uuid');
// Result: elixstar://live/stream-uuid

// Hashtag
const link = generateDeepLink('hashtag', 'trending');
// Result: elixstar://hashtag/trending
```

---

## 🎮 WebSocket Events Reference

### Client → Server

| Event | Data | Purpose |
|-------|------|---------|
| `chat_message` | `{ message: string }` | Send chat message |
| `gift_sent` | `{ gift_id, quantity }` | Send virtual gift |
| `battle_invite` | `{ challenger_stream_id, time_limit }` | Challenge to battle |
| `battle_accepted` | `{ battle_id }` | Accept battle |
| `battle_declined` | `{ battle_id }` | Decline battle |
| `booster_activated` | `{ booster_id }` | Activate power-up |

### Server → Client

| Event | Data | Purpose |
|-------|------|---------|
| `connected` | `{ room_id, user_count }` | Connection confirmation |
| `user_joined` | `{ user_id, username }` | New viewer joined |
| `user_left` | `{ user_id }` | Viewer left |
| `chat_message` | `{ user_id, username, message, timestamp }` | New chat message |
| `gift_sent` | `{ user_id, username, gift_id, gift_name, gift_icon, quantity }` | Gift received |
| `battle_invite` | `{ battle_id, host_stream_id, time_limit }` | Battle invitation |
| `battle_accepted` | `{ battle_id }` | Battle started |
| `battle_score_update` | `{ battle_id, host_score, challenger_score }` | Score changed |
| `booster_activated` | `{ user_id, booster_id }` | Power-up used |
| `viewer_count_update` | `{ count }` | Viewer count changed |

---

## 🎁 Default Boosters

| ID | Name | Effect | Cost | Cooldown |
|----|------|--------|------|----------|
| `2x-multiplier` | 2x Multiplier | Double gift value for 30s | 500 | 60s |
| `steal-points` | Steal Points | Steal 10% of opponent score | 1000 | 120s |
| `freeze` | Freeze | Freeze opponent gifts for 15s | 750 | 90s |
| `shield` | Shield | Block next steal attempt | 300 | 60s |

---

## 💰 Default Coin Packages

| ID | Name | Coins | Bonus | Price |
|----|------|-------|-------|-------|
| `starter` | Starter Pack | 100 | 0 | $0.99 |
| `popular` | Popular Pack | 500 | 50 | $4.99 |
| `premium` | Premium Pack | 1000 | 200 | $9.99 |
| `ultimate` | Ultimate Pack | 5000 | 1500 | $49.99 |
| `mega` | Mega Pack | 10000 | 5000 | $99.99 |

---

## 🎯 Rate Limits

| Action | Window | Max Requests |
|--------|--------|--------------|
| Signup | 1 hour | 3 |
| Login | 15 min | 5 |
| Video Upload | 1 hour | 10 |
| Comment | 1 min | 5 |
| Chat Message | 1 min | 30 |
| Gift Send | 1 min | 20 |
| Report | 1 hour | 5 |

---

## 🛡️ Safety Checks

### Before Content Upload
```typescript
// Check if user is banned
const { data: ban } = await supabase
  .from('user_bans')
  .select('*')
  .eq('user_id', userId)
  .gt('expires_at', new Date().toISOString())
  .single();

if (ban) {
  alert('Your account is temporarily banned');
  return;
}
```

### Before Displaying Content
```typescript
// Check if user is blocked
const { data: block } = await supabase
  .from('blocks')
  .select('id')
  .eq('blocker_id', currentUserId)
  .eq('blocked_id', contentCreatorId)
  .single();

if (block) {
  // Hide this content
  return null;
}
```

---

## 📊 Useful SQL Queries

### Top Trending Videos (Last 24h)
```sql
SELECT v.*, ts.score
FROM videos v
JOIN trending_scores ts ON v.id = ts.video_id
WHERE ts.last_updated > NOW() - INTERVAL '24 hours'
ORDER BY ts.score DESC
LIMIT 50;
```

### User Coin Balance
```sql
SELECT coins, diamonds
FROM wallets
WHERE user_id = 'user-uuid';
```

### User's Transaction History
```sql
SELECT *
FROM wallet_ledger
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 100;
```

### Active Battles
```sql
SELECT *
FROM battles
WHERE status = 'active'
AND started_at > NOW() - INTERVAL '1 hour';
```

### Pending Reports
```sql
SELECT r.*, reporter.username as reporter_name
FROM reports r
LEFT JOIN profiles reporter ON r.reporter_id = reporter.user_id
WHERE r.status = 'pending'
ORDER BY r.created_at ASC;
```

### Most Used Hashtags (This Week)
```sql
SELECT tag, use_count, trending_score
FROM hashtags
WHERE last_used > NOW() - INTERVAL '7 days'
ORDER BY trending_score DESC
LIMIT 50;
```

---

## 🎨 Component Examples

### Show Comments Drawer
```typescript
import CommentsDrawer from './components/CommentsDrawer';

<CommentsDrawer
  isOpen={showComments}
  onClose={() => setShowComments(false)}
  videoId={currentVideoId}
/>
```

### Show Share Sheet
```typescript
import ShareSheet from './components/ShareSheet';

<ShareSheet
  isOpen={showShare}
  onClose={() => setShowShare(false)}
  contentType="video"
  contentId={videoId}
  contentTitle="Check out my video!"
  contentUrl={videoUrl}
/>
```

### Display Wallet Balance
```typescript
import WalletBalance from './components/WalletBalance';

<WalletBalance userId={currentUserId} variant="compact" />
```

### Live Battle UI
```typescript
import LiveBattleUI from './components/LiveBattleUI';

<LiveBattleUI
  battleId={currentBattleId}
  streamId={streamId}
  isHost={true}
  userId={currentUserId}
/>
```

### Gift Animation
```typescript
import GiftAnimationOverlay from './components/GiftAnimationOverlay';

<GiftAnimationOverlay streamId={streamId} />
```

---

## 🔌 WebSocket Connection

```typescript
import { websocket } from './lib/websocket';

// In your live stream component
useEffect(() => {
  const token = 'user-auth-token';
  websocket.connect(streamId, token);

  websocket.on('chat_message', (data) => {
    setMessages(prev => [...prev, data]);
  });

  return () => {
    websocket.disconnect();
  };
}, [streamId]);
```

---

## 📈 Analytics Events

### Video Events
- `video_view` - Video started
- `video_like` - Video liked
- `video_unlike` - Video unliked
- `video_comment` - Comment posted
- `video_share` - Video shared
- `video_download` - Video downloaded
- `video_complete` - Video watched to end
- `video_skip` - Video skipped
- `video_not_interested` - Marked not interested

### Live Events
- `live_join` - Joined live stream
- `live_leave` - Left live stream
- `live_chat_message` - Sent chat message
- `gift_send` - Sent gift

### Battle Events
- `battle_invite_sent` - Sent battle invitation
- `battle_accept` - Accepted battle
- `battle_decline` - Declined battle
- `booster_activate` - Activated booster

### Purchase Events
- `purchase_intent` - Started purchase flow
- `purchase_complete` - Purchase succeeded
- `purchase_failed` - Purchase failed

### User Events
- `user_signup` - New account created
- `user_login` - User logged in
- `user_follow` - Followed another user
- `user_block` - Blocked another user
- `profile_view` - Viewed a profile
- `profile_update` - Updated own profile

---

## 🛠️ Development Tips

### Hot Module Reload
Changes to these files will hot-reload:
- All `.tsx` components
- All `.ts` utilities
- `index.css`

Changes requiring full reload:
- `.env` variables
- `capacitor.config.ts`
- `vite.config.ts`

### Debug Mode

Check `import.meta.env.DEV` for dev-only features:

```typescript
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

### Mock Data

For testing without backend:

```typescript
const MOCK_VIDEOS = [
  { id: '1', video_url: '/gifts/video1.mp4', ... },
  { id: '2', video_url: '/gifts/video2.mp4', ... },
];
```

---

## 🐛 Common Issues

**Issue:** WebSocket won't connect  
**Fix:** Check `VITE_WEBSOCKET_URL` in .env and ensure server is running

**Issue:** Videos won't upload  
**Fix:** Check Supabase Storage bucket permissions and quota

**Issue:** Coins not updating after purchase  
**Fix:** Verify Stripe webhook is configured and receiving events

**Issue:** Push notifications not working  
**Fix:** Check Capacitor config, Firebase setup, and device permissions

**Issue:** Trending videos not updating  
**Fix:** Run `SELECT update_trending_scores();` manually or set up cron job

---

## 📦 Required npm Packages

```json
{
  "@capacitor/push-notifications": "^6.0.0",
  "@capacitor/share": "^6.0.0",
  "@capacitor/clipboard": "^6.0.0",
  "ws": "^8.18.0"
}
```

Install with:
```bash
npm install @capacitor/push-notifications @capacitor/share @capacitor/clipboard ws
```

---

**This reference guide covers all major features and APIs in the MVP implementation.**
