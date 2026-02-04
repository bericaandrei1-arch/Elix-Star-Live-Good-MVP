import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  likes: number;
  time: string;
  isLiked?: boolean;
  replies?: Comment[];
}

interface Music {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  coverUrl?: string;
  previewUrl?: string;
}

interface VideoStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

interface Video {
  id: string;
  url: string;
  thumbnail?: string;
  duration: string;
  user: User;
  description: string;
  hashtags: string[];
  music: Music;
  stats: VideoStats;
  createdAt: string;
  location?: string;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  comments: Comment[];
  quality?: 'auto' | '720p' | '1080p';
  privacy?: 'public' | 'friends' | 'private';
}

interface VideoStore {
  videos: Video[];
  likedVideos: string[];
  savedVideos: string[];
  followingUsers: string[];
  
  // Video actions
  addVideo: (video: Video) => void;
  removeVideo: (videoId: string) => void;
  updateVideo: (videoId: string, updates: Partial<Video>) => void;
  
  // Like actions
  toggleLike: (videoId: string) => void;
  getLikedVideos: () => Video[];
  
  // Save actions
  toggleSave: (videoId: string) => void;
  getSavedVideos: () => Video[];
  
  // Follow actions
  toggleFollow: (userId: string) => void;
  getFollowingUsers: () => User[];
  
  // Comment actions
  addComment: (videoId: string, comment: Omit<Comment, 'id' | 'time'>) => void;
  deleteComment: (videoId: string, commentId: string) => void;
  toggleCommentLike: (videoId: string, commentId: string) => void;
  
  // Analytics
  incrementViews: (videoId: string) => void;
  getTrendingVideos: () => Video[];
  getRecommendedVideos: (userId: string) => Video[];
}

export const useVideoStore = create<VideoStore>()(
  persist(
    (set, get) => ({
      videos: [
        {
          id: 'cartoon1',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnail: 'https://picsum.photos/400/600?random=1',
          duration: '9:56',
          user: {
            id: 'user1',
            username: 'cartoon_fan',
            name: 'Cartoon Fan',
            avatar: 'https://i.pravatar.cc/150?u=cartoon1',
            level: 15,
            isVerified: true,
            followers: 50000,
            following: 200
          },
          description: 'Big Buck Bunny - Animated Short Film 🐰',
          hashtags: ['cartoon', 'animated', 'funny'],
          music: {
            id: 'original',
            title: 'Original Sound',
            artist: 'Creator',
            duration: '9:56'
          },
          stats: {
            views: 10000,
            likes: 850,
            comments: 45,
            shares: 120,
            saves: 200
          },
          createdAt: '2026-02-01T10:00:00Z',
          location: 'For You',
          isLiked: false,
          isSaved: false,
          isFollowing: false,
          comments: [],
          quality: '1080p',
          privacy: 'public'
        }
      ],
      likedVideos: [],
      savedVideos: [],
      followingUsers: [],

      // Video actions
      addVideo: (video) => set((state) => ({ 
        videos: [video, ...state.videos] 
      })),
      
      removeVideo: (videoId) => set((state) => ({
        videos: state.videos.filter(video => video.id !== videoId)
      })),
      
      updateVideo: (videoId, updates) => set((state) => ({
        videos: state.videos.map(video => 
          video.id === videoId ? { ...video, ...updates } : video
        )
      })),

      // Like actions
      toggleLike: (videoId) => set((state) => {
        const video = state.videos.find(v => v.id === videoId);
        if (!video) return state;

        const isLiked = video.isLiked;
        const newLikedVideos = isLiked 
          ? state.likedVideos.filter(id => id !== videoId)
          : [...state.likedVideos, videoId];

        return {
          videos: state.videos.map(v => 
            v.id === videoId 
              ? { 
                  ...v, 
                  isLiked: !isLiked,
                  stats: {
                    ...v.stats,
                    likes: isLiked ? v.stats.likes - 1 : v.stats.likes + 1
                  }
                }
              : v
          ),
          likedVideos: newLikedVideos
        };
      }),

      getLikedVideos: () => {
        const { videos, likedVideos } = get();
        return videos.filter(video => likedVideos.includes(video.id));
      },

      // Save actions
      toggleSave: (videoId) => set((state) => {
        const video = state.videos.find(v => v.id === videoId);
        if (!video) return state;

        const isSaved = video.isSaved;
        const newSavedVideos = isSaved 
          ? state.savedVideos.filter(id => id !== videoId)
          : [...state.savedVideos, videoId];

        return {
          videos: state.videos.map(v => 
            v.id === videoId 
              ? { 
                  ...v, 
                  isSaved: !isSaved,
                  stats: {
                    ...v.stats,
                    saves: isSaved ? v.stats.saves - 1 : v.stats.saves + 1
                  }
                }
              : v
          ),
          savedVideos: newSavedVideos
        };
      }),

      getSavedVideos: () => {
        const { videos, savedVideos } = get();
        return videos.filter(video => savedVideos.includes(video.id));
      },

      // Follow actions
      toggleFollow: (userId) => set((state) => {
        const newFollowingUsers = state.followingUsers.includes(userId)
          ? state.followingUsers.filter(id => id !== userId)
          : [...state.followingUsers, userId];

        return {
          videos: state.videos.map(video => 
            video.user.id === userId 
              ? { 
                  ...video, 
                  isFollowing: !video.isFollowing,
                  user: {
                    ...video.user,
                    followers: video.isFollowing 
                      ? video.user.followers - 1 
                      : video.user.followers + 1
                  }
                }
              : video
          ),
          followingUsers: newFollowingUsers
        };
      }),

      getFollowingUsers: () => {
        const { videos, followingUsers } = get();
        return videos
          .map(video => video.user)
          .filter(user => followingUsers.includes(user.id));
      },

      // Comment actions
      addComment: (videoId, commentData) => set((state) => {
        const newComment: Comment = {
          ...commentData,
          id: `comment_${Date.now()}_${Math.random()}`,
          time: 'now'
        };

        return {
          videos: state.videos.map(video => 
            video.id === videoId 
              ? { 
                  ...video, 
                  comments: [...video.comments, newComment],
                  stats: {
                    ...video.stats,
                    comments: video.stats.comments + 1
                  }
                }
              : video
          )
        };
      }),

      deleteComment: (videoId, commentId) => set((state) => ({
        videos: state.videos.map(video => 
          video.id === videoId 
            ? { 
                ...video, 
                comments: video.comments.filter(c => c.id !== commentId),
                stats: {
                  ...video.stats,
                  comments: Math.max(0, video.stats.comments - 1)
                }
              }
            : video
        )
      })),

      toggleCommentLike: (videoId, commentId) => set((state) => ({
        videos: state.videos.map(video => 
          video.id === videoId 
            ? {
                ...video,
                comments: video.comments.map(comment => 
                  comment.id === commentId 
                    ? { 
                        ...comment, 
                        isLiked: !comment.isLiked,
                        likes: comment.isLiked 
                          ? comment.likes - 1 
                          : comment.likes + 1
                      }
                    : comment
                )
              }
            : video
        )
      })),

      // Analytics
      incrementViews: (videoId) => set((state) => ({
        videos: state.videos.map(video => 
          video.id === videoId 
            ? { 
                ...video, 
                stats: {
                  ...video.stats,
                  views: video.stats.views + 1
                }
              }
            : video
        )
      })),

      getTrendingVideos: () => {
        const { videos } = get();
        return [...videos].sort((a, b) => {
          const engagementA = (a.stats.likes + a.stats.comments + a.stats.shares) / a.stats.views;
          const engagementB = (b.stats.likes + b.stats.comments + b.stats.shares) / b.stats.views;
          return engagementB - engagementA;
        });
      },

      getRecommendedVideos: () => {
        const { videos, likedVideos, followingUsers } = get();
        const userLikedTags = videos
          .filter(v => likedVideos.includes(v.id))
          .flatMap(v => v.hashtags);
        
        const userFollowing = followingUsers;
        
        return videos
          .filter(video => !likedVideos.includes(video.id))
          .map(video => {
            let score = 0;
            
            // Boost for liked hashtags
            const commonTags = video.hashtags.filter(tag => 
              userLikedTags.includes(tag)
            ).length;
            score += commonTags * 2;
            
            // Boost for following users
            if (userFollowing.includes(video.user.id)) {
              score += 5;
            }
            
            // Boost for verified users
            if (video.user.isVerified) {
              score += 1;
            }
            
            // Boost for recent content
            const daysSinceUpload = (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceUpload < 7) {
              score += 1;
            }
            
            return { video, score };
          })
          .sort((a, b) => b.score - a.score)
          .map(({ video }) => video)
          .slice(0, 10);
      }
    }),
    {
      name: 'video-store-v3',
      partialize: (state) => ({
        likedVideos: state.likedVideos,
        savedVideos: state.savedVideos,
        followingUsers: state.followingUsers
      })
    }
  )
);
