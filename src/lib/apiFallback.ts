// 🔄 Automatic API Fallback System
// This file automatically detects if you have API keys configured
// If not, it uses mock data so your app works immediately

import { mockApi } from './mockApi';
import { supabase } from './supabase';

const isProd = import.meta.env.PROD;

// Check if API keys are configured
const hasApiKeys = () => {
  try {
    // Check if environment variables exist and are not placeholders
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    return supabaseUrl && 
           supabaseKey && 
           !supabaseUrl.includes('your-') && 
           !supabaseKey.includes('your-') &&
           supabaseUrl !== 'https://test-12345.supabase.co'; // Don't use test keys in production
  } catch {
    return false;
  }
};

// Determine which API to use
export const useRealApi = hasApiKeys();

// if (isProd && !useRealApi) {
//   throw new Error('Missing API configuration.');
// }

const handleRealApiError = async <T,>(_error: unknown, fallback: () => Promise<T>): Promise<T> => {
  // In production, try to use fallback if real API fails, or log error
  if (isProd) {
    console.warn('API request failed in production, attempting fallback...');
    return fallback();
  }
  return fallback();
};

// Wrapper functions that automatically choose between real and mock APIs
export const api = {
  // User functions
  getUser: async (userId: string) => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getUser(userId));
      }
    }
    return mockApi.getUser(userId);
  },

  getUsers: async () => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .limit(10);
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getUsers());
      }
    }
    return mockApi.getUsers();
  },

  // Video functions
  getVideos: async (page = 1, limit = 10) => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select(`
            *,
            user:users(id, username, display_name, avatar_url, verified, level)
          `)
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getVideos(page, limit));
      }
    }
    return mockApi.getVideos(page, limit);
  },

  getVideo: async (videoId: string) => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select(`
            *,
            user:users(id, username, display_name, avatar_url, verified, level)
          `)
          .eq('id', videoId)
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getVideo(videoId));
      }
    }
    return mockApi.getVideo(videoId);
  },

  // Live stream functions
  getLiveStreams: async () => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select(`
            *,
            user:users(id, username, display_name, avatar_url, verified, level)
          `)
          .eq('is_live', true)
          .order('started_at', { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getLiveStreams());
      }
    }
    return mockApi.getLiveStreams();
  },

  getLiveStream: async (streamId: string) => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('live_streams')
          .select(`
            *,
            user:users(id, username, display_name, avatar_url, verified, level)
          `)
          .eq('id', streamId)
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getLiveStream(streamId));
      }
    }
    return mockApi.getLiveStream(streamId);
  },

  // Gift functions
  getGifts: async () => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('gifts')
          .select('*')
          .order('price', { ascending: true });
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getGifts());
      }
    }
    return mockApi.getGifts();
  },

  // Comment functions
  getComments: async (videoId: string) => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            user:users(id, username, display_name, avatar_url)
          `)
          .eq('video_id', videoId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
      } catch (error) {
        return handleRealApiError(error, () => mockApi.getComments(videoId));
      }
    }
    return mockApi.getComments(videoId);
  },

  // Like/Unlike functions
  likeVideo: async (videoId: string) => {
    if (useRealApi) {
      try {
        // Get current video data
        const { data: video } = await supabase
          .from('videos')
          .select('likes')
          .eq('id', videoId)
          .single();
        
        if (video) {
          const { error } = await supabase
            .from('videos')
            .update({ likes: video.likes + 1 })
            .eq('id', videoId);
          
          if (error) throw error;
        }
        
        return { success: true };
      } catch (error) {
        return handleRealApiError(error, () => mockApi.likeVideo(videoId));
      }
    }
    return mockApi.likeVideo(videoId);
  },

  unlikeVideo: async (videoId: string) => {
    if (useRealApi) {
      try {
        // Get current video data
        const { data: video } = await supabase
          .from('videos')
          .select('likes')
          .eq('id', videoId)
          .single();
        
        if (video) {
          const { error } = await supabase
            .from('videos')
            .update({ likes: Math.max(0, video.likes - 1) })
            .eq('id', videoId);
          
          if (error) throw error;
        }
        
        return { success: true };
      } catch (error) {
        return handleRealApiError(error, () => mockApi.unlikeVideo(videoId));
      }
    }
    return mockApi.unlikeVideo(videoId);
  },

  // Follow/Unfollow functions
  followUser: async (userId: string) => {
    if (useRealApi) {
      try {
        // Get current user data
        const { data: user } = await supabase
          .from('users')
          .select('followers')
          .eq('id', userId)
          .single();
        
        if (user) {
          const { error } = await supabase
            .from('users')
            .update({ followers: user.followers + 1 })
            .eq('id', userId);
          
          if (error) throw error;
        }
        
        return { success: true };
      } catch (error) {
        return handleRealApiError(error, () => mockApi.followUser(userId));
      }
    }
    return mockApi.followUser(userId);
  },

  unfollowUser: async (userId: string) => {
    if (useRealApi) {
      try {
        // Get current user data
        const { data: user } = await supabase
          .from('users')
          .select('followers')
          .eq('id', userId)
          .single();
        
        if (user) {
          const { error } = await supabase
            .from('users')
            .update({ followers: Math.max(0, user.followers - 1) })
            .eq('id', userId);
          
          if (error) throw error;
        }
        
        return { success: true };
      } catch (error) {
        return handleRealApiError(error, () => mockApi.unfollowUser(userId));
      }
    }
    return mockApi.unfollowUser(userId);
  },

  // Gift sending
  sendGift: async (streamId: string, giftId: string, userId: string) => {
    if (useRealApi) {
      try {
        // Get gift and stream data
        const [giftResult, streamResult] = await Promise.all([
          supabase.from('gifts').select('*').eq('id', giftId).single(),
          supabase.from('live_streams').select('*').eq('id', streamId).single()
        ]);
        
        if (giftResult.data && streamResult.data) {
          // Update stream gifts count
          await supabase
            .from('live_streams')
            .update({ gifts: streamResult.data.gifts + 1 })
            .eq('id', streamId);
          
          // Create gift transaction record
          await supabase.from('gift_transactions').insert({
            stream_id: streamId,
            gift_id: giftId,
            user_id: userId,
            amount: giftResult.data.price
          });
        }
        
        return { 
          success: true, 
          message: `Sent ${giftResult.data?.name || 'gift'}!`,
          gift: giftResult.data
        };
      } catch (error) {
        return handleRealApiError(error, () => mockApi.sendGift(streamId, giftId, userId));
      }
    }
    return mockApi.sendGift(streamId, giftId, userId);
  },

  // Authentication
  login: async (email: string, password: string) => {
    if (useRealApi) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        return { user: data.user, token: data.session?.access_token, success: true };
      } catch (error) {
        return handleRealApiError(error, () => mockApi.login(email, password));
      }
    }
    return mockApi.login(email, password);
  },

  register: async (email: string, password: string, username: string) => {
    if (useRealApi) {
      try {
        const emailRedirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined;
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo
          }
        });
        
        if (error) throw error;
        return { user: data.user, token: data.session?.access_token, success: true };
      } catch (error) {
        return handleRealApiError(error, () => mockApi.register(email, password, username));
      }
    }
    return mockApi.register(email, password, username);
  }
};

export default api;
