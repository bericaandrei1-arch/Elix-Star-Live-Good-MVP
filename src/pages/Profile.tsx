import React, { useState, useEffect } from 'react';
import { Share2, Menu, Lock, Play, Heart, EyeOff, Camera, Sparkles, Sword } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../lib/avatarUpload';
import { trackEvent } from '../lib/analytics';

interface Video {
  id: string;
  thumbnail_url: string;
  views_count: number;
  is_private: boolean;
}

interface ProfileData {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const { user, updateUser } = useAuthStore();
  const isDev = import.meta.env.DEV;
  
  const [activeTab, setActiveTab] = useState<'videos' | 'private' | 'liked' | 'battles'>(
    (tabParam as any) || 'videos'
  );
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  
  const isOwnProfile = !routeUserId || routeUserId === user?.id;
  const displayUserId = routeUserId || user?.id;
  
  const displayName = profileData?.display_name || profileData?.username || 'User';
  const displayUsername = profileData?.username || 'user';
  const displayAvatar = profileData?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;

  useEffect(() => {
    if (displayUserId) {
      loadProfile();
      loadVideos();
      if (!isOwnProfile && user?.id) {
        checkFollowing();
      }
    }
  }, [displayUserId, activeTab]);

  const loadProfile = async () => {
    if (!displayUserId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', displayUserId)
        .single();

      if (error) throw error;
      setProfileData(data);
      trackEvent('profile_view', { user_id: displayUserId, is_own: isOwnProfile });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    if (!displayUserId) return;

    try {
      let query = supabase.from('videos').select('id, thumbnail_url, views_count, is_private');

      if (activeTab === 'videos') {
        query = query.eq('user_id', displayUserId).eq('is_private', false);
      } else if (activeTab === 'private' && isOwnProfile) {
        query = query.eq('user_id', displayUserId).eq('is_private', true);
      } else if (activeTab === 'liked') {
        // Get liked videos
        const { data: likes } = await supabase
          .from('likes')
          .select('video_id')
          .eq('user_id', displayUserId);
        
        const videoIds = likes?.map(l => l.video_id) || [];
        if (videoIds.length === 0) {
          setVideos([]);
          return;
        }
        query = query.in('id', videoIds);
      } else if (activeTab === 'battles') {
        // TODO: Load battle history
        setVideos([]);
        return;
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  const checkFollowing = async () => {
    if (!user?.id || !displayUserId || isOwnProfile) return;

    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', displayUserId)
      .single();

    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!user?.id || !displayUserId || isOwnProfile) return;

    try {
      if (isFollowing) {
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', displayUserId);
        setIsFollowing(false);
      } else {
        await supabase
          .from('followers')
          .insert({ follower_id: user.id, following_id: displayUserId });
        setIsFollowing(true);
        trackEvent('user_follow', { target_user_id: displayUserId });
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    if (!user) {
      setAvatarError('You must be logged in to change your avatar.');
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      const publicUrl = await uploadAvatar(file, user.id);
      const { error } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (error) throw new Error(error.message);
      updateUser({ avatar: publicUrl });
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : 'Avatar upload failed.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDevTopUp = async () => {
    if (!user) return;
    if (!isDev) return;
    if (!window.confirm('Recharge 999,999 coins for testing?')) return;
    
    try {
        // Update profiles (source for LiveStream)
        const { error } = await supabase
            .from('profiles')
            .update({ coin_balance: 999999 })
            .eq('user_id', user.id);
            
        if (error) throw error;
        alert('Coins updated successfully! You now have 999,999 coins.');
    } catch (e) {
        console.error(e);
        alert('Failed to update coins. You might need admin rights.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 pt-4 flex justify-center">
      <div className="w-full max-w-[500px]">
        <header className="flex justify-between items-center px-4 mb-6">
            <div className="w-6"></div> {/* Spacer */}
            <h1 className="font-black text-2xl flex items-center gap-2 text-white/90 tracking-tight drop-shadow-sm">
                {displayName}
            </h1>
            <div className="flex space-x-4">
                <EyeOff size={24} />
                <button type="button" onClick={() => navigate('/settings')} className="cursor-pointer" aria-label="Settings" title="Settings">
                  <Menu size={24} />
                </button>
            </div>
        </header>

        <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-gray-700 rounded-full mb-3 border-2 border-secondary/50 relative p-1 group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                 <img src={displayAvatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                 <div className="absolute inset-0 bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                 </div>
                 <input 
                   type="file" 
                   id="avatar-upload" 
                   className="hidden" 
                   accept="image/*"
                   aria-label="Upload profile photo"
                   onChange={(e) => handleAvatarFile(e.target.files?.[0])} 
                 />
            </div>
            {isUploadingAvatar && <div className="text-xs text-white/70">Uploading...</div>}
            {avatarError && <div className="text-xs text-rose-300 mt-1">{avatarError}</div>}
            <h2 className="text-xl font-extrabold mt-2 text-white/80">@{displayUsername}</h2>
            
            <div className="flex space-x-8 mt-4">
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg">{formatNumber(profileData?.following_count || 0)}</span>
                    <span className="text-gray-400 text-xs">Following</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg">{formatNumber(profileData?.followers_count || 0)}</span>
                    <span className="text-gray-400 text-xs">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-lg">{formatNumber(profileData?.likes_count || 0)}</span>
                    <span className="text-gray-400 text-xs">Likes</span>
                </div>
            </div>

            <div className="w-full px-4 mt-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-transparent5 border border-transparent rounded-xl px-3 py-3 flex items-center justify-center">
                  <div className="text-xs font-extrabold text-white/80">A1</div>
                </div>
                <div className="bg-transparent5 border border-transparent rounded-xl px-3 py-3 flex items-center justify-center">
                  <div className="text-xs font-extrabold text-white/80">LVL</div>
                </div>
                <div className="bg-transparent5 border border-transparent rounded-xl px-3 py-3 flex items-center justify-center">
                  <div className="text-xs font-extrabold text-white/80">TOP</div>
                </div>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
                {isOwnProfile ? (
                  <>
                    <button 
                        onClick={() => navigate('/edit-profile')}
                        className="px-8 py-2 bg-gray-800 rounded text-sm font-semibold"
                    >
                        Edit profile
                    </button>
                    <button type="button" className="p-2 bg-gray-800 rounded" aria-label="Share profile" title="Share profile">
                        <Share2 size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={toggleFollow}
                      className={`flex-1 px-8 py-2 rounded text-sm font-semibold transition ${
                        isFollowing
                          ? 'bg-transparent10 text-white hover:bg-transparent20'
                          : 'bg-[#E6B36A] text-black hover:opacity-90'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={() => navigate(`/messages/new?userId=${displayUserId}`)}
                      className="px-6 py-2 bg-gray-800 rounded text-sm font-semibold hover:bg-gray-700 transition"
                    >
                      Message
                    </button>
                    <button type="button" className="p-2 bg-gray-800 rounded" aria-label="Share profile" title="Share profile">
                        <Share2 size={20} />
                    </button>
                  </>
                )}
            </div>
        </div>

        {/* Bio */}
        {profileData?.bio && (
          <div className="px-4 text-center mb-6 text-sm">
            <p>{profileData.bio}</p>
          </div>
        )}

        <div className="px-4 mb-6">
          <button
            onClick={() => navigate('/creator/login-details')}
            className="w-full flex items-center justify-between p-4 bg-transparent5 border border-transparent rounded-xl hover:bg-transparent10 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E6B36A]/15 border border-[#E6B36A]/25 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#E6B36A]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Creator login details</div>
                <div className="text-xs text-white/60">Create account, sign in, and save details</div>
              </div>
            </div>
            <div className="text-xs text-[#E6B36A] font-semibold">Open</div>
          </button>
        </div>

        {isDev && (
          <div className="px-4 mb-6">
            <button
              onClick={handleDevTopUp}
              className="w-full p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> DEV: Recharge 999,999 Coins
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-800 flex justify-around text-gray-500">
            <button
              type="button"
              onClick={() => setActiveTab('videos')}
              className={`pb-2 border-b-2 ${
                activeTab === 'videos' ? 'border-white text-white' : 'border-transparent'
              } w-1/4 flex justify-center`}
              aria-label="Videos tab"
            >
                <Play size={20} fill={activeTab === 'videos' ? 'currentColor' : 'none'} />
            </button>
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setActiveTab('private')}
                className={`pb-2 border-b-2 ${
                  activeTab === 'private' ? 'border-white text-white' : 'border-transparent'
                } w-1/4 flex justify-center`}
                aria-label="Private tab"
              >
                  <Lock size={20} fill={activeTab === 'private' ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('liked')}
              className={`pb-2 border-b-2 ${
                activeTab === 'liked' ? 'border-white text-white' : 'border-transparent'
              } w-1/4 flex justify-center`}
              aria-label="Likes tab"
            >
                <Heart size={20} fill={activeTab === 'liked' ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('battles')}
              className={`pb-2 border-b-2 ${
                activeTab === 'battles' ? 'border-white text-white' : 'border-transparent'
              } w-1/4 flex justify-center`}
              aria-label="Battles tab"
            >
                <Sword size={20} fill={activeTab === 'battles' ? 'currentColor' : 'none'} />
            </button>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-[1px] mt-[1px]">
             {videos.map((video) => (
                 <a
                   key={video.id}
                   href={`/video/${video.id}`}
                   className="aspect-[3/4] bg-gray-800 relative group"
                 >
                    <img 
                        src={video.thumbnail_url || '/placeholder-video.png'} 
                        alt="Video Thumbnail" 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" 
                    />
                    {video.is_private && (
                      <div className="absolute top-2 right-2">
                        <Lock size={16} className="text-white drop-shadow" />
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 flex items-center text-xs font-bold text-white drop-shadow-md">
                        <Play size={10} className="mr-1" fill="white" /> {formatNumber(video.views_count)}
                    </span>
                 </a>
             ))}
        </div>
        
        {!loading && videos.length === 0 && (
          <div className="text-center py-12 text-white/40">
            {activeTab === 'videos' && 'No videos yet'}
            {activeTab === 'private' && 'No private videos'}
            {activeTab === 'liked' && 'No liked videos'}
            {activeTab === 'battles' && 'No battle history'}
          </div>
        )}
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}
