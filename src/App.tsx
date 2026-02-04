import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import VideoFeed from './pages/VideoFeed';
import LiveStream from './pages/LiveStream';
import LiveDiscover from './pages/LiveDiscover';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Create from './pages/Create';
// import Empty from './components/Empty';
import { BottomNav } from './components/BottomNav';
import { useAuthStore } from './store/useAuthStore';
import { cn } from './lib/utils';
import { useDeepLinks } from './lib/deepLinks';
import { analytics } from './lib/analytics';
import { notificationService } from './lib/notifications';

import SavedVideos from './pages/SavedVideos';
import MusicFeed from './pages/MusicFeed';
import FollowingFeed from './pages/FollowingFeed';
import SearchPage from './pages/SearchPage';
import VideoView from './pages/VideoView';
import Inbox from './pages/Inbox';
import ChatThread from './pages/ChatThread';
import FriendsFeed from './pages/FriendsFeed';
import EditProfile from './pages/EditProfile';
import Settings from './pages/Settings';
import CreatorLoginDetails from './pages/CreatorLoginDetails';
import AuthCallback from './pages/AuthCallback';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Copyright from './pages/Copyright';
import Legal from './pages/Legal';
import LegalAudio from './pages/LegalAudio';
import LegalUGC from './pages/LegalUGC';
import LegalAffiliate from './pages/LegalAffiliate';
import LegalDMCA from './pages/LegalDMCA';
import LegalSafety from './pages/LegalSafety';
import RequireAuth from './components/RequireAuth';
import DesignSystem from './pages/DesignSystem';
import Discover from './pages/Discover';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminReports from './pages/admin/Reports';
import AdminEconomy from './pages/admin/Economy';
import Hashtag from './pages/Hashtag';
import BlockedAccounts from './pages/settings/BlockedAccounts';
import SafetyCenter from './pages/settings/SafetyCenter';
import PurchaseCoins from './pages/PurchaseCoins';
import Report from './pages/Report';
import Support from './pages/Support';
import Guidelines from './pages/Guidelines';

function App() {
  const { checkUser, user } = useAuthStore();
  const location = useLocation();
  const isDev = import.meta.env.DEV;

  // Initialize deep links
  useDeepLinks();

  useEffect(() => {
    checkUser();
    
    // Initialize analytics
    analytics.initialize();
    
    // Initialize push notifications
    notificationService.initialize();
  }, [checkUser]);

  useEffect(() => {
    // Set analytics user ID when user logs in
    if (user?.id) {
      analytics.setUserId(user.id);
    } else {
      analytics.setUserId(null);
    }
  }, [user]);

  const isFullScreen =
    location.pathname === '/' ||
    location.pathname === '/feed' ||
    location.pathname.startsWith('/video/') ||
    location.pathname === '/live' ||
    location.pathname.startsWith('/live/') ||
    location.pathname.startsWith('/music/') ||
    location.pathname === '/following';

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <main className={cn("min-h-screen", !isFullScreen && "pb-32")}>
        <Routes>
          <Route path="/" element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<VideoFeed />} />
          {isDev && <Route path="/design" element={<DesignSystem />} />}
          <Route path="/following" element={<FollowingFeed />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/hashtag/:tag" element={<Hashtag />} />
          <Route path="/report" element={<Report />} />
          <Route path="/support" element={<Support />} />
          <Route path="/video/:videoId" element={<VideoView />} />
          <Route path="/live" element={<LiveDiscover />} />
          <Route path="/live/:streamId" element={<LiveStream />} />
          <Route path="/live/start" element={<Navigate to="/live/broadcast" replace />} />
          <Route path="/live/watch/:streamId" element={<LiveStream />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/friends" element={<FriendsFeed />} />
          <Route path="/saved" element={<SavedVideos />} />
          <Route path="/music/:songId" element={<MusicFeed />} />
          <Route path="/create" element={<Create />} />
          <Route path="/creator/login-details" element={<CreatorLoginDetails />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/inbox/:threadId" element={<ChatThread />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/copyright" element={<Copyright />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/legal/audio" element={<LegalAudio />} />
          <Route path="/legal/ugc" element={<LegalUGC />} />
          <Route path="/legal/affiliate" element={<LegalAffiliate />} />
          <Route path="/legal/dmca" element={<LegalDMCA />} />
          <Route path="/legal/safety" element={<LegalSafety />} />
          <Route path="/guidelines" element={<Guidelines />} />

          <Route element={<RequireAuth />}>
            <Route path="/upload" element={<Upload />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/blocked" element={<BlockedAccounts />} />
            <Route path="/settings/safety" element={<SafetyCenter />} />
            <Route path="/purchase-coins" element={<PurchaseCoins />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/economy" element={<AdminEconomy />} />
          </Route>
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default App;
