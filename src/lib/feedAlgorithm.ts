// For You Feed Algorithm Configuration

import { supabase } from './supabase';

export interface FeedVideo {
  id: string;
  score: number;
  reason: string;
}

export interface UserPreferences {
  userId: string;
  likedVideoIds: string[];
  notInterestedVideoIds: string[];
  followingUserIds: string[];
  watchedHashtags: string[];
}

/**
 * Generate personalized feed based on user preferences and trending scores
 */
export async function generatePersonalizedFeed(
  userId: string | null,
  limit: number = 50
): Promise<string[]> {
  try {
    if (!userId) {
      // Anonymous user - show trending only
      return await getTrendingVideos(limit);
    }

    // Load user preferences
    const preferences = await loadUserPreferences(userId);

    // Get candidate videos from multiple sources
    const [trending, following, similar] = await Promise.all([
      getTrendingVideos(20),
      getFollowingVideos(userId, 15),
      getSimilarVideos(userId, preferences, 15),
    ]);

    // Combine and deduplicate
    const allVideos = new Set([...trending, ...following, ...similar]);

    // Filter out not-interested and blocked
    const filtered = Array.from(allVideos).filter(
      id => !preferences.notInterestedVideoIds.includes(id)
    );

    // Shuffle and limit
    const shuffled = shuffleArray(filtered);
    return shuffled.slice(0, limit);
  } catch (error) {
    console.error('Failed to generate feed:', error);
    // Fallback to trending
    return await getTrendingVideos(limit);
  }
}

/**
 * Get trending videos based on trending_scores
 */
async function getTrendingVideos(limit: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('trending_scores')
    .select('video_id')
    .order('score', { ascending: false })
    .limit(limit);

  return data?.map(row => row.video_id) || [];
}

/**
 * Get videos from followed users
 */
async function getFollowingVideos(userId: string, limit: number): Promise<string[]> {
  const { data: following } = await supabase
    .from('followers')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = following?.map(f => f.following_id) || [];

  if (followingIds.length === 0) return [];

  const { data } = await supabase
    .from('videos')
    .select('id')
    .in('user_id', followingIds)
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data?.map(v => v.id) || [];
}

/**
 * Get videos similar to user's liked content (same hashtags)
 */
async function getSimilarVideos(
  userId: string,
  preferences: UserPreferences,
  limit: number
): Promise<string[]> {
  if (preferences.watchedHashtags.length === 0) return [];

  const { data } = await supabase
    .from('video_hashtags')
    .select('video_id')
    .in('hashtag', preferences.watchedHashtags)
    .limit(limit);

  return data?.map(vh => vh.video_id) || [];
}

/**
 * Load user preferences from database
 */
async function loadUserPreferences(userId: string): Promise<UserPreferences> {
  const [likes, notInterested, following, hashtags] = await Promise.all([
    supabase
      .from('likes')
      .select('video_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('user_not_interested')
      .select('video_id')
      .eq('user_id', userId)
      .limit(500),
    supabase.from('followers').select('following_id').eq('follower_id', userId),
    supabase
      .from('video_interactions')
      .select('video_id')
      .eq('user_id', userId)
      .eq('interaction_type', 'view')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(async res => {
        const videoIds = res.data?.map(vi => vi.video_id) || [];
        if (videoIds.length === 0) return [];

        const { data } = await supabase
          .from('video_hashtags')
          .select('hashtag')
          .in('video_id', videoIds);

        return data?.map(vh => vh.hashtag) || [];
      }),
  ]);

  return {
    userId,
    likedVideoIds: likes.data?.map(l => l.video_id) || [],
    notInterestedVideoIds: notInterested.data?.map(ni => ni.video_id) || [],
    followingUserIds: following.data?.map(f => f.following_id) || [],
    watchedHashtags: hashtags || [],
  };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Track video interaction for algorithm improvement
 */
export async function trackVideoInteraction(
  userId: string | null,
  videoId: string,
  interactionType: 'view' | 'like' | 'comment' | 'share' | 'complete' | 'skip'
) {
  if (!userId) return;

  try {
    await supabase.from('video_interactions').insert({
      user_id: userId,
      video_id: videoId,
      interaction_type: interactionType,
    });
  } catch (error) {
    // Silent fail - this is analytics, not critical
    console.error('Failed to track interaction:', error);
  }
}
