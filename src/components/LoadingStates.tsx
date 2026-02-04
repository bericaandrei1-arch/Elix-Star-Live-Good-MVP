import React from 'react';
import { Loader2, Video, Users, MessageCircle } from 'lucide-react';

/**
 * Full-screen loading spinner
 */
export function FullScreenLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#E6B36A] animate-spin mx-auto mb-4" />
        <p className="text-white/60">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function InlineLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  
  return (
    <Loader2 className={`${sizeClass} text-[#E6B36A] animate-spin`} />
  );
}

/**
 * Loading skeleton for video grid
 */
export function VideoGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[9/16] bg-white rounded animate-pulse">
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-8 h-8 text-white/20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for user list
 */
export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-xl">
          <div className="w-12 h-12 bg-white rounded-full animate-pulse flex items-center justify-center">
            <Users className="w-6 h-6 text-white/20" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white rounded animate-pulse w-1/3"></div>
            <div className="h-3 bg-white rounded animate-pulse w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for comments
 */
export function CommentsListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-10 h-10 bg-white rounded-full animate-pulse flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-white/20" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white rounded animate-pulse w-1/4"></div>
            <div className="h-4 bg-white rounded animate-pulse w-3/4"></div>
            <div className="h-3 bg-white rounded animate-pulse w-1/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton for cards (admin dashboard, etc.)
 */
export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
          <div className="h-12 bg-white rounded mb-3"></div>
          <div className="h-6 bg-white rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-8">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-white/40" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-white/60 mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-[#E6B36A] text-black rounded-full font-bold hover:opacity-90 transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
