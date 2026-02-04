# Elix Star MVP - Setup & Deployment Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
npm install @capacitor/push-notifications @capacitor/share @capacitor/clipboard
npm install ws @supabase/supabase-js
```

### 2. Environment Setup

Create `.env` file:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (for coin purchases)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# WebSocket
VITE_WEBSOCKET_URL=ws://localhost:8080
WS_PORT=8080

# Optional: External Analytics
VITE_POSTHOG_API_KEY=phc_...
POSTHOG_API_KEY=phc_...

# Optional: Push Notifications
VITE_FIREBASE_VAPID_KEY=...
```

### 3. Database Setup

Run all migrations:

```bash
# Connect to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Or run manually via Supabase Dashboard SQL Editor:
# Run each file in supabase/migrations/ in order
```

### 4. Start Services

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - WebSocket Server:**
```bash
npm run ws:server
```

**Terminal 3 - Supabase (if local):**
```bash
supabase start
```

---

## 🗃️ Database Migrations

All migrations in `supabase/migrations/` with prefix `20260204_`:

| Migration | Purpose |
|-----------|---------|
| `wallet_ledger_system.sql` | Coins/diamonds wallet with immutable ledger |
| `comments_system.sql` | Comments with replies and likes |
| `blocks_and_moderation.sql` | User blocking and reporting |
| `boosters_system.sql` | Battle boosters catalog |
| `purchases_verification.sql` | In-app purchase verification |
| `trending_and_discovery.sql` | Trending algorithm and hashtags |
| `inbox_messages.sql` | Direct messages and notifications |
| `device_tokens.sql` | Push notification tokens |
| `analytics_events.sql` | Analytics event storage |

### Migration Order

Run in this order (they're already timestamped):
1. wallet_ledger_system
2. comments_system
3. blocks_and_moderation
4. boosters_system
5. purchases_verification
6. trending_and_discovery
7. inbox_messages
8. device_tokens
9. analytics_events

---

## 🔐 Supabase Configuration

### Storage Buckets Required

Create in Supabase Dashboard → Storage:

1. **`user-content`** (Public)
   - For: videos, thumbnails, avatars
   - Max file size: 500MB
   - Allowed types: image/*, video/*

### RLS Policies

Enable Row Level Security on all tables. Example policies:

```sql
-- Example: Videos table
CREATE POLICY "Users can view public videos"
ON videos FOR SELECT
USING (is_private = false OR user_id = auth.uid());

CREATE POLICY "Users can insert their own videos"
ON videos FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own videos"
ON videos FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own videos"
ON videos FOR DELETE
USING (user_id = auth.uid());
```

Apply similar policies to all tables based on your security requirements.

---

## 💳 Stripe Setup

### 1. Create Products

In Stripe Dashboard → Products, create coin packages:

- Starter Pack: $0.99 → 100 coins
- Popular Pack: $4.99 → 550 coins
- Premium Pack: $9.99 → 1,200 coins
- Ultimate Pack: $49.99 → 6,500 coins
- Mega Pack: $99.99 → 15,000 coins

### 2. Configure Webhooks

Add webhook endpoint: `https://your-domain.com/api/stripe-webhook`

Events to listen for:
- `checkout.session.completed`
- `charge.refunded`
- `charge.dispute.created`

### 3. Update Database

Insert product IDs into `coin_packages` table:

```sql
UPDATE coin_packages
SET stripe_product_id = 'prod_...'
WHERE id = 'starter';
```

---

## 📱 Mobile App Setup

### iOS

1. **Configure Capabilities** in Xcode:
   - Push Notifications
   - Background Modes → Remote notifications
   - Associated Domains → `applinks:elixstar.live`

2. **Update Info.plist**:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>elixstar</string>
    </array>
  </dict>
</array>
```

3. **Apple Developer Portal**:
   - Enable Push Notifications capability
   - Create APNs keys
   - Configure Universal Links

### Android

1. **Update AndroidManifest.xml**:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="elixstar" />
</intent-filter>
```

2. **Firebase Console**:
   - Add Android app
   - Download `google-services.json` → `android/app/`
   - Enable Cloud Messaging

### Build

```bash
# iOS
npm run build
npx cap sync ios
npx cap open ios

# Android
npm run build
npx cap sync android
npx cap open android
```

---

## 🔄 Cron Jobs Setup

Set up scheduled tasks (using Supabase Edge Functions, Vercel Cron, or cron):

### 1. Update Trending Scores
**Frequency:** Every 15 minutes

```sql
SELECT update_trending_scores();
```

### 2. Cleanup Old Data
**Frequency:** Daily at 3 AM

```sql
-- Delete old notifications
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete old analytics events
DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '90 days';

-- Deactivate inactive device tokens
UPDATE device_tokens
SET is_active = false
WHERE updated_at < NOW() - INTERVAL '60 days';
```

### 3. Daily Stats Aggregation
**Frequency:** Daily at midnight

```sql
-- Your analytics aggregation queries
-- Store in a separate analytics_daily table
```

---

## 🌐 Deployment

### Frontend (Vercel/Netlify)

```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

### WebSocket Server (Railway/Fly.io/DigitalOcean)

**Using Railway:**
1. Create new project
2. Add WebSocket service
3. Set environment variables
4. Deploy from `server/` directory

**Using Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["node", "--loader", "ts-node/esm", "server/websocket-server.ts"]
```

### Environment Variables (Production)

**Frontend (Vercel):**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_WEBSOCKET_URL` (wss://your-ws-server.com)
- `VITE_POSTHOG_API_KEY` (optional)

**Backend (Railway):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `POSTHOG_API_KEY` (optional)
- `WS_PORT=8080`

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Sign up new account
- [ ] Log in existing account
- [ ] Log out
- [ ] Password reset

**Video Features:**
- [ ] Upload video
- [ ] Like/unlike video
- [ ] Comment on video
- [ ] Reply to comment
- [ ] Share video
- [ ] Report video
- [ ] Mark "Not Interested"

**Social Features:**
- [ ] Follow/unfollow user
- [ ] View user profile
- [ ] Send direct message
- [ ] View notifications
- [ ] Block/unblock user

**Live Streaming:**
- [ ] Start live stream
- [ ] Send chat message
- [ ] Send gift
- [ ] Challenge to battle
- [ ] Accept battle
- [ ] Activate booster
- [ ] End stream

**Purchases:**
- [ ] View coin packages
- [ ] Purchase coins (Stripe test mode)
- [ ] Verify coins credited
- [ ] Check wallet balance

**Search & Discovery:**
- [ ] Search videos
- [ ] Search users
- [ ] Browse hashtags
- [ ] View trending videos

**Admin Panel:**
- [ ] View dashboard stats
- [ ] Manage users
- [ ] Review reports
- [ ] Update economy settings

### Automated Testing

Create tests for:
- Wallet transactions (credit/debit)
- Feed algorithm
- Rate limiting
- Video upload validation
- Comment system
- Notification triggers

---

## 📊 Monitoring

### Key Metrics to Track

1. **User Engagement:**
   - Daily Active Users (DAU)
   - Video views
   - Live stream participation
   - Comment/like rates

2. **Revenue:**
   - Coin purchases
   - Average transaction value
   - Gift sending rate

3. **Performance:**
   - Video load time
   - WebSocket latency
   - API response times
   - Error rates

4. **Safety:**
   - Reports per 1000 users
   - Ban rate
   - False positive rate

### Monitoring Tools

- **Supabase Dashboard** - Database health
- **Vercel Analytics** - Frontend performance
- **PostHog** (optional) - User behavior
- **Sentry** (recommended) - Error tracking

---

## 🔧 Maintenance

### Weekly Tasks
- Review and resolve user reports
- Monitor error logs
- Check database performance
- Update trending scores manually if needed

### Monthly Tasks
- Review and update coin package pricing
- Analyze user retention metrics
- Update community guidelines if needed
- Review and ban policy violators

### Quarterly Tasks
- Security audit
- Performance optimization
- Feature usage analysis
- User feedback review

---

## 🆘 Troubleshooting

### WebSocket Connection Issues

**Problem:** "Connection refused"
**Solution:** Ensure WebSocket server is running and VITE_WEBSOCKET_URL is correct

### Push Notifications Not Working

**Problem:** Notifications not received
**Solution:** 
1. Check permissions granted
2. Verify FCM/APNs configuration
3. Check device token saved in database

### Videos Not Uploading

**Problem:** Upload fails
**Solution:**
1. Check file size < 500MB
2. Check duration < 3 minutes
3. Verify Supabase Storage bucket exists and is public
4. Check storage quota

### Coins Not Credited After Purchase

**Problem:** Stripe payment succeeded but coins not added
**Solution:**
1. Check webhook is receiving events
2. Verify `verify_purchase` function ran
3. Check wallet_ledger for transaction
4. Manually credit using `credit_wallet` function

---

## 📞 Support

For issues:
1. Check logs in browser console
2. Check Supabase logs
3. Check WebSocket server logs
4. Review error boundary reports

---

## ✅ Production Readiness Checklist

**Before going live:**

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Storage buckets created and public
- [ ] Stripe products created
- [ ] Stripe webhook configured
- [ ] WebSocket server deployed
- [ ] Analytics configured
- [ ] Push notifications configured (iOS & Android)
- [ ] Deep linking tested
- [ ] Error tracking enabled
- [ ] Rate limiting tested
- [ ] Admin accounts created
- [ ] Community guidelines published
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] App store assets prepared
- [ ] Beta testing completed

---

**MVP Implementation Complete! 🎉**

All features from the TikTok-Style MVP specification have been implemented and are ready for backend integration and deployment.
