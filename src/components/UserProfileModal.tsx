import React, { useState } from 'react';
import { X, UserPlus, UserMinus, MessageCircle, Share2, MoreHorizontal, Flag, Ban, Bell, BellOff } from 'lucide-react';
import { useVideoStore } from '../store/useVideoStore';
import { useAuthStore } from '../store/useAuthStore';
import { LevelBadge } from './LevelBadge';
import { useSafetyStore } from '../store/useSafetyStore';
import ReportModal from './ReportModal';

interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
  level?: number;
  isVerified?: boolean;
  followers: number;
  following: number;
  isFollowing?: boolean;
  bio?: string;
  website?: string;
  location?: string;
  joinedDate?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onFollow: () => void;
}

export default function UserProfileModal({ isOpen, onClose, user, onFollow }: UserProfileModalProps) {
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const { videos } = useVideoStore();
  const { user: currentUser, session } = useAuthStore();
  const blockedUserIds = useSafetyStore((s) => s.blockedUserIds);
  const blockUser = useSafetyStore((s) => s.blockUser);
  const unblockUser = useSafetyStore((s) => s.unblockUser);
  
  const userVideos = videos.filter(video => video.user.id === user.id);
  const isOwnProfile = currentUser?.id === user.id;
  const isBlocked = blockedUserIds.includes(user.id);

  if (!isOpen) return null;

  const handleMessage = () => {
    // Navigate to chat with user
  };

  const handleBlockUser = async () => {
    if (window.confirm(`Are you sure you want to block @${user.username}?`)) {
      const token = session?.access_token;
      if (token) {
        await fetch('/api/block-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ blockedUserId: user.id, action: 'block' }),
        }).catch(() => null);
      }
      blockUser(user.id);
      onClose();
    }
  };

  const handleReportUser = () => {
    setShowMoreOptions(false);
    setShowReportModal(true);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center p-4">
        <div className="bg-[#121212] rounded-2xl p-6 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-white font-semibold mb-2">User Blocked</h3>
          <p className="text-white/60 text-sm mb-4">
            You have blocked @{user.username}. You will no longer see their content.
          </p>
          <button
            onClick={async () => {
              const token = session?.access_token;
              if (token) {
                await fetch('/api/block-user', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ blockedUserId: user.id, action: 'unblock' }),
                }).catch(() => null);
              }
              unblockUser(user.id);
            }}
            className="px-4 py-2 bg-white text-white rounded-lg hover:bg-white transition-colors"
          >
            Unblock User
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center p-4">
      <div className="bg-[#121212] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-transparent">
          <h3 className="text-white font-semibold">Profile</h3>
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover"
              />
              {user.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                  <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <LevelBadge level={user.level ?? 1} size={10} layout="fixed" />
                <h2 className="text-white font-bold text-lg truncate">{user.name}</h2>
                {user.isVerified && <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0" />}
              </div>
              <p className="text-white/60 text-sm mb-2">@{user.username}</p>
              
              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="text-white font-semibold">{formatNumber(user.followers)}</div>
                  <div className="text-white/60">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold">{formatNumber(user.following)}</div>
                  <div className="text-white/60">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold">{userVideos.length}</div>
                  <div className="text-white/60">Videos</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-white border border-transparent rounded-xl px-3 py-3 flex items-center justify-center">
              <div className="text-xs font-extrabold text-white/80">A1</div>
            </div>
            <div className="bg-white border border-transparent rounded-xl px-3 py-3 flex items-center justify-center">
              <LevelBadge level={user.level ?? 1} size={10} layout="fixed" />
            </div>
            <div className="bg-white border border-transparent rounded-xl px-3 py-3 flex items-center justify-center">
              <div className="text-xs font-extrabold text-white/80">TOP</div>
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mb-4">
              <p className="text-white text-sm leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Additional Info */}
          <div className="space-y-2 mb-6">
            {user.location && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <div className="w-4 h-4 bg-white rounded-full" />
                <span>{user.location}</span>
              </div>
            )}
            {user.website && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white rounded-full" />
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FE2C55] text-sm hover:underline"
                >
                  {user.website}
                </a>
              </div>
            )}
            {user.joinedDate && (
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <div className="w-4 h-4 bg-white rounded-full" />
                <span>Joined {formatDate(user.joinedDate)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            {!isOwnProfile && (
              <>
                {user.isFollowing ? (
                  <button
                    onClick={onFollow}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-white rounded-lg hover:bg-white transition-colors"
                  >
                    <UserMinus size={16} />
                    <span>Following</span>
                  </button>
                ) : (
                  <button
                    onClick={onFollow}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#FE2C55] text-white rounded-lg hover:bg-[#FE2C55]/80 transition-colors"
                  >
                    <UserPlus size={16} />
                    <span>Follow</span>
                  </button>
                )}
                
                <button
                  onClick={handleMessage}
                  className="px-4 py-2 bg-white text-white rounded-lg hover:bg-white transition-colors"
                >
                  <MessageCircle size={16} />
                </button>
              </>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="px-4 py-2 bg-white text-white rounded-lg hover:bg-white transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              
              {showMoreOptions && (
                <div className="absolute top-full right-0 mt-2 bg-[#1a1a1a] rounded-lg shadow-xl border border-transparent z-10 min-w-[200px]">
                  {!isOwnProfile && (
                    <>
                      <button
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white transition-colors text-left"
                      >
                        {notificationsEnabled ? <BellOff size={16} /> : <Bell size={16} />}
                        <span>{notificationsEnabled ? 'Disable' : 'Enable'} Notifications</span>
                      </button>
                      
                      <button
                        onClick={handleShareProfile}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white transition-colors text-left"
                      >
                        <Share2 size={16} />
                        <span>Share Profile</span>
                      </button>
                      
                      <div className="border-t border-transparent my-1" />
                      
                      <button
                        onClick={handleReportUser}
                        className="w-full flex items-center gap-3 px-4 py-3 text-orange-400 hover:bg-white transition-colors text-left"
                      >
                        <Flag size={16} />
                        <span>Report User</span>
                      </button>
                      
                      <button
                        onClick={handleBlockUser}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white transition-colors text-left"
                      >
                        <Ban size={16} />
                        <span>Block User</span>
                      </button>
                    </>
                  )}
                  
                  {isOwnProfile && (
                    <>
                      <button
                        onClick={() => {/* Edit profile */}}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white transition-colors text-left"
                      >
                        <div className="w-4 h-4 bg-white rounded-full" />
                        <span>Edit Profile</span>
                      </button>
                      
                      <button
                        onClick={() => {/* View analytics */}}
                        className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white transition-colors text-left"
                      >
                        <div className="w-4 h-4 bg-white rounded-full" />
                        <span>View Analytics</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Videos Preview */}
        {userVideos.length > 0 && (
          <div className="px-6 pb-6">
            <h4 className="text-white font-semibold mb-3">Recent Videos</h4>
            <div className="grid grid-cols-3 gap-2">
              {userVideos.slice(0, 3).map((video) => (
                <div key={video.id} className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                  <img
                    src={video.thumbnail || `https://picsum.photos/150/200?random=${video.id}`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 text-white text-xs bg-black px-1 py-0.5 rounded">
                    {video.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        videoId=""
        contentType="user"
        contentId={user.id}
      />
    </div>
  );

  function handleShareProfile() {
    const profileUrl = `${window.location.origin}/profile/${user.username}`;
    if (navigator.share) {
      navigator.share({
        title: `Check out ${user.name}'s profile`,
        text: `Check out ${user.name} (@${user.username}) on Elix Star - ${user.bio || ''}`,
        url: profileUrl,
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      alert('Profile link copied to clipboard!');
    }
  }
}
