import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, TrendingUp, Hash, Users, Video as VideoIcon } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface Video {
  id: string;
  user_id: string;
  thumbnail_url: string;
  video_url: string;
  description: string;
  views_count: number;
  likes_count: number;
  creator?: { username: string; avatar_url: string | null };
}

interface User {
  user_id: string;
  username: string;
  avatar_url: string | null;
  followers_count: number;
}

interface Hashtag {
  tag: string;
  use_count: number;
  trending_score: number;
}

export default function Discover() {
  const [activeTab, setActiveTab] = useState<'trending' | 'search' | 'hashtags'>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [searchResults, setSearchResults] = useState<{ videos: Video[]; users: User[] }>({
    videos: [],
    users: [],
  });
  const [trendingHashtags, setTrendingHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'trending') {
      loadTrending();
    } else if (activeTab === 'hashtags') {
      loadHashtags();
    }
  }, [activeTab]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        performSearch();
      }, 300); // Debounce
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*, creator:profiles!user_id(username, avatar_url), trending:trending_scores(score)')
        .order('trending.score', { ascending: false })
        .limit(30);

      if (error) throw error;
      setTrendingVideos(data || []);
    } catch (error) {
      console.error('Failed to load trending:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHashtags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('trending_score', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTrendingHashtags(data || []);
    } catch (error) {
      console.error('Failed to load hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return;

    setLoading(true);
    trackEvent('search_query', { query: searchQuery });

    try {
      const [videosRes, usersRes] = await Promise.all([
        supabase
          .from('videos')
          .select('*, creator:profiles!user_id(username, avatar_url)')
          .ilike('description', `%${searchQuery}%`)
          .limit(20),
        supabase
          .from('profiles')
          .select('user_id, username, avatar_url, followers_count')
          .ilike('username', `%${searchQuery}%`)
          .limit(20),
      ]);

      setSearchResults({
        videos: videosRes.data || [],
        users: usersRes.data || [],
      });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black z-10 px-4 py-4 border-b border-transparent">
        <h1 className="text-2xl font-bold mb-4">Discover</h1>

        {/* Search Bar */}
        <div className="flex items-center gap-3 rounded-full px-4 py-3">
          <Search className="w-5 h-5 text-white/60" />
          <input
            type="text"
            placeholder="Search videos, users, hashtags..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (e.target.value.length >= 2) {
                setActiveTab('search');
              }
            }}
            className="flex-1 bg-transparent outline-none text-white placeholder-white/40"
          />
        </div>

        {/* Tabs */}
        {searchQuery.length < 2 && (
          <div className="flex gap-4 mt-4">
            <TabButton
              active={activeTab === 'trending'}
              onClick={() => setActiveTab('trending')}
              icon={<TrendingUp className="w-5 h-5" />}
              label="Trending"
            />
            <TabButton
              active={activeTab === 'hashtags'}
              onClick={() => setActiveTab('hashtags')}
              icon={<Hash className="w-5 h-5" />}
              label="Hashtags"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === 'trending' && (
          <div className="grid grid-cols-3 gap-1">
            {trendingVideos.map(video => (
              <VideoThumbnail key={video.id} video={video} />
            ))}
            {trendingVideos.length === 0 && !loading && (
              <div className="col-span-3 text-center py-12 text-white/40">No trending videos</div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div>
            {/* Users */}
            {searchResults.users.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Users
                </h2>
                <div className="space-y-2">
                  {searchResults.users.map(user => (
                    <UserSearchResult key={user.user_id} user={user} />
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {searchResults.videos.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <VideoIcon className="w-5 h-5" />
                  Videos
                </h2>
                <div className="grid grid-cols-3 gap-1">
                  {searchResults.videos.map(video => (
                    <VideoThumbnail key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}

            {searchResults.videos.length === 0 && searchResults.users.length === 0 && !loading && (
              <div className="text-center py-12 text-white/40">No results found</div>
            )}
          </div>
        )}

        {activeTab === 'hashtags' && (
          <div className="space-y-2">
            {trendingHashtags.map(hashtag => (
              <HashtagItem key={hashtag.tag} hashtag={hashtag} />
            ))}
            {trendingHashtags.length === 0 && !loading && (
              <div className="text-center py-12 text-white/40">No hashtags found</div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-white/40">Loading...</div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
        active ? 'bg-[#E6B36A] text-black' : 'bg-transparent text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function VideoThumbnail({ video }: { video: Video }) {
  return (
    <a href={`/video/${video.id}`} className="relative aspect-[9/16] bg-gray-800 rounded overflow-hidden">
      <img
        src={video.thumbnail_url || '/placeholder-video.png'}
        alt="Video"
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
        <Heart className="w-3 h-3" />
        {formatNumber(video.views_count)}
      </div>
    </a>
  );
}

function UserSearchResult({ user }: { user: User }) {
  return (
    <a
      href={`/profile/${user.username}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:brightness-125 transition"
    >
      <img
        src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`}
        alt={user.username}
        className="w-12 h-12 object-cover"
      />
      <div className="flex-1">
        <p className="font-semibold">{user.username}</p>
        <p className="text-sm text-white/60">{formatNumber(user.followers_count || 0)} followers</p>
      </div>
      <button className="px-4 py-2 bg-[#E6B36A] text-black rounded-full font-semibold text-sm">
        Follow
      </button>
    </a>
  );
}

function HashtagItem({ hashtag }: { hashtag: Hashtag }) {
  return (
    <a
      href={`/hashtag/${hashtag.tag}`}
      onClick={() => trackEvent('hashtag_click', { hashtag: hashtag.tag })}
      className="flex items-center justify-between p-4 rounded-lg hover:brightness-125 transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#E6B36A] to-[#B8935C] rounded-full flex items-center justify-center">
          <Hash className="w-5 h-5 text-black" />
        </div>
        <div>
          <p className="font-semibold">#{hashtag.tag}</p>
          <p className="text-sm text-white/60">{formatNumber(hashtag.use_count)} videos</p>
        </div>
      </div>
      <TrendingUp className="w-5 h-5 text-[#E6B36A]" />
    </a>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function Heart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
    </svg>
  );
}
