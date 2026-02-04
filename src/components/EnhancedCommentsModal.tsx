import React, { useState, useRef } from 'react';
import { X, Send, Heart, Trash2, Edit3, MessageSquare } from 'lucide-react';
import { useVideoStore } from '../store/useVideoStore';
import { useAuthStore } from '../store/useAuthStore';

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

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  comments: Comment[];
}

export default function CommentsModal({ isOpen, onClose, videoId, comments }: CommentsModalProps) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mostLiked'>('newest');
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuthStore();
  const { addComment, deleteComment, toggleCommentLike } = useVideoStore();

  if (!isOpen) return null;

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const commentData = {
      userId: user?.id || 'current_user',
      username: user?.username || 'current_user',
      avatar: user?.avatar || 'https://i.pravatar.cc/150?img=current',
      text: newComment.trim(),
      likes: 0
    };

    addComment(videoId, commentData);
    setNewComment('');
    setReplyingTo(null);
    
    // Scroll to bottom
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteComment(videoId, commentId);
    }
  };

  const handleLikeComment = (commentId: string) => {
    toggleCommentLike(videoId, commentId);
  };

  const handleEditComment = (_commentId: string, currentText: string) => {
    setEditingComment(_commentId);
    setEditText(currentText);
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    
    // In a real app, you'd have an updateComment function
    // For now, we'll just close the edit mode
    setEditingComment(null);
    setEditText('');
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    setNewComment(`@${comments.find(c => c.id === commentId)?.username} `);
  };

  const formatTime = (time: string) => {
    if (time === 'now') return 'Just now';
    return time;
  };

  const sortedComments = [...comments].sort((a, b) => {
    switch (sortBy) {
      case 'oldest':
        return a.id.localeCompare(b.id);
      case 'mostLiked':
        return b.likes - a.likes;
      case 'newest':
      default:
        return b.id.localeCompare(a.id);
    }
  });

  return (
    <div className="fixed inset-0 z-[400] bg-black flex items-end">
      <div className="w-full h-[80vh] bg-[#121212] rounded-t-2xl flex flex-col border-t border-transparent animate-slide-up" style={{animation: 'slide-up 0.3s ease-out'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-transparent">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold">{comments.length} comments</h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'mostLiked')}
              className="bg-black text-white text-xs rounded px-2 py-1 border-none outline-none"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="mostLiked">Most Liked</option>
            </select>
          </div>
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sortedComments.length === 0 ? (
            <div className="text-center text-white/60 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            sortedComments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <img 
                  src={comment.avatar} 
                  alt={comment.username} 
                  className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-white/80 text-sm font-semibold">@{comment.username}</span>
                    <span className="text-white/40 text-xs">{formatTime(comment.time)}</span>
                  </div>
                  
                  {editingComment === comment.id ? (
                    <div className="mt-1">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-black text-white text-sm rounded p-2 resize-none border-none outline-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveEdit()}
                          className="px-3 py-1 bg-[#FE2C55] text-white text-xs rounded hover:bg-[#FE2C55]/80"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingComment(null)}
                          className="px-3 py-1 bg-white text-white text-xs rounded hover:bg-black"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white text-sm mt-0.5 break-words">{comment.text}</p>
                  )}
                  
                  <div className="flex items-center gap-4 mt-2">
                    <button 
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center gap-1 text-xs ${
                        comment.isLiked ? 'text-[#FE2C55]' : 'text-white/40'
                      } hover:text-[#FE2C55] transition-colors`}
                    >
                      <Heart size={12} className={comment.isLiked ? 'fill-current' : ''} />
                      {comment.likes > 0 && comment.likes}
                    </button>
                    
                    <button 
                      onClick={() => handleReply(comment.id)}
                      className="text-white/40 text-xs hover:text-white transition-colors"
                    >
                      Reply
                    </button>
                    
                    {comment.userId === (user?.id || 'current_user') && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditComment(comment.id, comment.text)}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-white/40 hover:text-red-500 transition-colors ml-2"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Replies would go here */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2 ml-4 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <img 
                            src={reply.avatar} 
                            alt={reply.username} 
                            className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0" 
                          />
                          <div className="flex-1">
                            <div className="flex items-baseline gap-1">
                              <span className="text-white/80 text-xs font-semibold">@{reply.username}</span>
                              <span className="text-white/40 text-xs">{formatTime(reply.time)}</span>
                            </div>
                            <p className="text-white text-xs mt-0.5">{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-transparent flex items-start gap-3 bg-[#121212]">
          <img 
            src={user?.avatar || 'https://i.pravatar.cc/150?img=current'} 
            alt={user?.username || 'You'} 
            className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" 
          />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
              className="w-full bg-black text-white rounded-lg p-3 text-sm focus:outline-none focus:bg-white resize-none"
              rows={2}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
            />
            {replyingTo && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-white/60 text-xs">
                  Replying to @{comments.find(c => c.id === replyingTo)?.username}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-white/60 text-xs hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex justify-end mt-2">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-[#FE2C55] text-white text-sm rounded-lg hover:bg-[#FE2C55]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}