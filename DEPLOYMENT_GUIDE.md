# 🚀 Elix Star - Deployment Guide

Complete guide to deploy your app to production.

---

## 📋 Prerequisites

- ✅ All database migrations applied (see `RUN_THESE_IN_ORDER.md`)
- ✅ All dependencies installed (`npm install`)
- ✅ Environment variables configured (`.env`)
- ✅ Supabase project created
- ✅ Stripe account setup (for payments)

---

## 1️⃣ Deploy Backend (Supabase)

### Database Setup
```bash
# Already done if you followed RUN_THESE_IN_ORDER.md
# If not, run these files in Supabase SQL Editor:
1. ALL_NEW_FEATURES.sql
2. SECURITY_POLICIES.sql
3. STORAGE_SETUP.sql
4. CRON_JOBS.sql
```

### Storage Configuration
✅ Already configured via `STORAGE_SETUP.sql`

Verify:
- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/storage
- Bucket `user-content` should exist
- Public access enabled
- Max size: 500MB

---

## 2️⃣ Deploy WebSocket Server

### Option A: Deploy to DigitalOcean App Platform

1. Create `Dockerfile` (already exists)
2. Push to GitHub
3. Connect to DigitalOcean App Platform
4. Set environment variables:
   ```
   VITE_SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   WS_PORT=8080
   ```

### Option B: Deploy to Railway.app

```bash
npm install -g railway
railway login
railway init
railway up
```

Set environment variables in Railway dashboard.

### Option C: Deploy to Render.com

1. Connect GitHub repo
2. Select "Web Service"
3. Build command: `npm install`
4. Start command: `npm run ws:server`
5. Add environment variables

---

## 3️⃣ Deploy Frontend (Web App)

### Option A: Vercel (Recommended)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Environment variables in Vercel dashboard:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLISHABLE_KEY
VITE_WEBSOCKET_URL=wss://your-websocket-server.com
VITE_POSTHOG_API_KEY (optional)
VITE_FIREBASE_VAPID_KEY (optional)
```

### Option B: Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

### Option C: DigitalOcean Static Sites

1. Connect GitHub repo
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables

---

## 4️⃣ Deploy Mobile Apps

### iOS App Store

1. **Build the app:**
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```

2. **Configure in Xcode:**
   - Set Bundle ID: `com.elixstar.app`
   - Set version and build number
   - Configure signing & capabilities
   - Add push notifications capability

3. **Submit to App Store:**
   - Archive the app
   - Upload to App Store Connect
   - Fill in app metadata
   - Submit for review

### Android Play Store

1. **Build the app:**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

2. **Configure in Android Studio:**
   - Set application ID: `com.elixstar.app`
   - Set version code and version name
   - Generate signed APK/AAB

3. **Submit to Play Store:**
   - Create app in Play Console
   - Upload AAB file
   - Fill in store listing
   - Submit for review

---

## 5️⃣ Configure External Services

### Stripe (Payments)

1. Get API keys from: https://dashboard.stripe.com/apikeys
2. Create products for coin packages
3. Set up webhook endpoint: `https://your-domain.com/api/stripe-webhook`
4. Add environment variables:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Firebase (Push Notifications)

1. Create Firebase project: https://console.firebase.google.com
2. Enable Cloud Messaging
3. Get web push certificate (VAPID key)
4. Download `google-services.json` (Android)
5. Download `GoogleService-Info.plist` (iOS)
6. Add to environment:
   ```
   VITE_FIREBASE_VAPID_KEY=your_vapid_key
   FCM_SERVER_KEY=your_server_key
   ```

### Apple Push Notifications

1. Generate APNs certificate in Apple Developer
2. Upload to Firebase (if using FCM)
3. Or use native APNs:
   ```
   APPLE_TEAM_ID=your_team_id
   APPLE_KEY_ID=your_key_id
   APPLE_KEY_FILE=path/to/key.p8
   ```

### PostHog (Analytics - Optional)

1. Create account: https://posthog.com
2. Get API key
3. Add to environment:
   ```
   VITE_POSTHOG_API_KEY=phc_...
   ```

---

## 6️⃣ Domain & SSL

### Custom Domain

1. **Purchase domain** (e.g., elixstar.com)
2. **Point DNS to your hosting:**
   - Vercel: Add A/CNAME records
   - Netlify: Add A/CNAME records
   - DigitalOcean: Use their nameservers

3. **SSL Certificate:**
   - Vercel/Netlify: Automatic
   - DigitalOcean: Enable in settings
   - Self-hosted: Use Let's Encrypt

### Deep Links

Update `capacitor.config.ts`:
```typescript
{
  appId: 'com.elixstar.app',
  server: {
    hostname: 'elixstar.com',
    androidScheme: 'https'
  }
}
```

---

## 7️⃣ Monitoring & Logging

### Error Tracking (Optional)

Use Sentry:
```bash
npm install @sentry/react
```

Configure:
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'your_sentry_dsn',
  environment: 'production',
});
```

### Performance Monitoring

PostHog (already integrated) or Google Analytics.

### Server Logs

- WebSocket server: Use your hosting platform's logs
- API endpoints: Check Vercel/Netlify function logs
- Supabase: Check database logs in dashboard

---

## 8️⃣ Post-Deployment Checklist

After deployment, verify:

- [ ] Web app loads at your domain
- [ ] User can sign up/login
- [ ] Videos upload and play
- [ ] Live streaming works
- [ ] Comments post successfully
- [ ] Coin purchases work
- [ ] Push notifications send
- [ ] WebSocket connection stable
- [ ] Mobile apps approved and live
- [ ] Deep links work
- [ ] Social sharing works
- [ ] All pages accessible

---

## 🔄 CI/CD (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm run test
      - uses: vercel/action@v2
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## 📊 Scaling

As your app grows:

1. **Database:** Upgrade Supabase plan for more connections
2. **Storage:** Enable CDN for faster asset delivery
3. **WebSocket:** Deploy multiple instances with load balancer
4. **Caching:** Add Redis for session management
5. **CDN:** Use Cloudflare for static assets

---

## 🆘 Troubleshooting

**WebSocket won't connect:**
- Check CORS settings
- Verify WSS (not WS) for HTTPS sites
- Check firewall/security groups

**Videos won't upload:**
- Check storage bucket permissions
- Verify file size limits
- Check MIME types allowed

**Push notifications not working:**
- Verify Firebase config
- Check device token registration
- Test with Firebase Console

**Stripe payments fail:**
- Use test mode first
- Verify webhook signature
- Check API key permissions

---

## 📞 Support

- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs
- Capacitor: https://capacitorjs.com/docs
- Firebase: https://firebase.google.com/docs

---

**You're ready to launch! 🚀**
