import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Heart, Send, MoreVertical } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface Comment {
  id: string;
  video_id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  user?: { username: string; avatar_url: string | null };
  isLiked?: boolean;
}

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
}

export default function CommentsDrawer({ isOpen, onClose, videoId }: CommentsDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadComments();
      loadCurrentUser();
    }
  }, [isOpen, videoId]);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const loadCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id || null);
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:profiles!user_id(username, avatar_url)')
        .eq('video_id', videoId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Check which comments are liked by current user
      if (currentUserId && data) {
        const commentIds = data.map(c => c.id);
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .in('comment_id', commentIds)
          .eq('user_id', currentUserId);

        const likedIds = new Set(likes?.map(l => l.comment_id) || []);
        const commentsWithLikes = data.map(c => ({
          ...c,
          isLiked: likedIds.has(c.id),
        }));
        setComments(commentsWithLikes);
      } else {
        setComments(data || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          video_id: videoId,
          user_id: currentUserId,
          parent_id: replyingTo?.id || null,
          text: newComment.trim(),
        })
        .select('*, user:profiles!user_id(username, avatar_url)')
        .single();

      if (error) throw error;

      trackEvent('comment_post', { video_id: videoId, has_parent: !!replyingTo });

      // Add to list
      setComments(prev => [data, ...prev]);
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment');
    }
  };

  const toggleLike = async (comment: Comment) => {
    if (!currentUserId) return;

    try {
      if (comment.isLiked) {
        // Unlike
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId);

        setComments(prev =>
          prev.map(c =>
            c.id === comment.id
              ? { ...c, likes_count: c.likes_count - 1, isLiked: false }
              : c
          )
        );
      } else {
        // Like
        await supabase
          .from('comment_likes')
          .insert({ comment_id: comment.id, user_id: currentUserId });

        setComments(prev =>
          prev.map(c =>
            c.id === comment.id
              ? { ...c, likes_count: c.likes_count + 1, isLiked: true }
              : c
          )
        );

        trackEvent('comment_like', { comment_id: comment.id });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!currentUserId) return;

    try {
      await supabase
        .from('comments')
        .update({ status: 'deleted' })
        .eq('id', commentId)
        .eq('user_id', currentUserId);

      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] w-full max-h-[80vh] rounded-t-3xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <h2 className="text-lg font-bold">{comments.length} Comments</h2>
          <button onClick={onClose} className="p-2 hover:brightness-125 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onLike={() => toggleLike(comment)}
              onReply={() => setReplyingTo(comment)}
              onDelete={() => deleteComment(comment.id)}
            />
          ))}

          {loading && <div className="text-center py-8 text-white/40">Loading...</div>}
          {!loading && comments.length === 0 && (
            <div className="text-center py-12 text-white/40">No comments yet. Be the first!</div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 px-4 py-3 bg-black">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-white/60">
                Replying to <span className="text-[#E6B36A]">@{replyingTo.user?.username}</span>
              </span>
              <button onClick={() => setReplyingTo(null)} className="text-white/40 hover:text-white">
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && postComment()}
              maxLength={500}
              className="flex-1 rounded-full px-4 py-3 outline-none text-white placeholder-white/40"
            />
            <button
              onClick={postComment}
              disabled={!newComment.trim()}
              className="p-3 bg-[#E6B36A] rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Send className="w-5 h-5 text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  onLike,
  onReply,
  onDelete,
}: {
  comment: Comment;
  currentUserId: string | null;
  onLike: () => void;
  onReply: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-3">
      <img
        src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${comment.user?.username}`}
        alt={comment.user?.username}
        className="w-10 h-10 object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{comment.user?.username}</span>
          <span className="text-xs text-white/40">{formatTime(comment.created_at)}</span>
        </div>
        <p className="text-sm text-white/90 mb-2">{comment.text}</p>
        <div className="flex items-center gap-4 text-xs text-white/60">
          <button onClick={onLike} className="flex items-center gap-1 hover:text-white transition">
            <Heart className={`w-4 h-4 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            {comment.likes_count > 0 && comment.likes_count}
          </button>
          <button onClick={onReply} className="hover:text-white transition">
            Reply
          </button>
          {comment.replies_count > 0 && (
            <span className="text-[#E6B36A]">{comment.replies_count} replies</span>
          )}
          {currentUserId === comment.user_id && (
            <button onClick={onDelete} className="ml-auto hover:text-red-500 transition">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}
