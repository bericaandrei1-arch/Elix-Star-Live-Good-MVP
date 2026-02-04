import React from 'react';
import { supabase } from '../lib/supabase';
import { EyeOff, Flag, Link, UserX, Bookmark, Download } from 'lucide-react';
import { trackEvent } from '../lib/analytics';

interface VideoActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoUrl: string;
  creatorId: string;
  currentUserId: string | null;
  isOwnVideo: boolean;
}

export default function VideoActionMenu({
  isOpen,
  onClose,
  videoId,
  videoUrl,
  creatorId,
  currentUserId,
  isOwnVideo,
}: VideoActionMenuProps) {
  if (!isOpen) return null;

  const handleNotInterested = async () => {
    if (!currentUserId) return;

    try {
      await supabase.from('user_not_interested').insert({
        user_id: currentUserId,
        video_id: videoId,
      });

      trackEvent('video_not_interested', { video_id: videoId });
      alert('We\'ll show you less content like this');
      onClose();
    } catch (error) {
      console.error('Failed to mark not interested:', error);
    }
  };

  const handleReport = () => {
    trackEvent('report_intent', { content_type: 'video', content_id: videoId });
    window.location.href = `/report?type=video&id=${videoId}`;
  };

  const handleBlock = async () => {
    if (!currentUserId || isOwnVideo) return;

    if (confirm('Block this user? You won\'t see their content anymore.')) {
      try {
        await supabase.from('blocks').insert({
          blocker_id: currentUserId,
          blocked_id: creatorId,
        });

        trackEvent('user_block', { blocked_user_id: creatorId });
        alert('User blocked successfully');
        onClose();
      } catch (error) {
        console.error('Failed to block user:', error);
        alert('Failed to block user');
      }
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/video/${videoId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
    trackEvent('video_link_copy', { video_id: videoId });
    onClose();
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `elixstar-video-${videoId}.mp4`;
    a.click();
    trackEvent('video_download', { video_id: videoId });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black60 z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] w-full rounded-t-3xl px-4 py-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-transparent20 rounded-full mx-auto mb-6"></div>

        <div className="space-y-1">
          {!isOwnVideo && (
            <>
              <ActionMenuItem
                icon={<EyeOff className="w-5 h-5" />}
                label="Not interested"
                onClick={handleNotInterested}
              />
              <ActionMenuItem
                icon={<UserX className="w-5 h-5" />}
                label="Block this user"
                onClick={handleBlock}
                danger
              />
            </>
          )}

          <ActionMenuItem
            icon={<Flag className="w-5 h-5" />}
            label="Report"
            onClick={handleReport}
            danger={!isOwnVideo}
          />

          <ActionMenuItem
            icon={<Link className="w-5 h-5" />}
            label="Copy link"
            onClick={handleCopyLink}
          />

          <ActionMenuItem
            icon={<Download className="w-5 h-5" />}
            label="Download video"
            onClick={handleDownload}
          />
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-4 bg-transparent10 rounded-xl font-semibold hover:bg-transparent20 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ActionMenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-transparent5 transition ${
        danger ? 'text-red-400' : 'text-white'
      }`}
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </button>
  );
}
