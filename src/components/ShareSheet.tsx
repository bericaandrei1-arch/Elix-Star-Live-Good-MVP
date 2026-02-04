import React from 'react';
import { X, Link, MessageCircle, Facebook, Twitter, Instagram, Download } from 'lucide-react';
import { generateDeepLink, generateWebLink } from '../lib/deepLinks';
import { trackEvent } from '../lib/analytics';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'video' | 'user' | 'live';
  contentId: string;
  contentTitle?: string;
  contentUrl?: string;
}

export default function ShareSheet({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentTitle,
  contentUrl,
}: ShareSheetProps) {
  if (!isOpen) return null;

  const shareUrl = contentUrl || generateWebLink(contentType, contentId);
  const deepLink = generateDeepLink(contentType, contentId);
  const title = contentTitle || `Check this out on Elix Star!`;

  const handleShare = async (platform: string) => {
    trackEvent('share_content', { platform, content_type: contentType, content_id: contentId });

    switch (platform) {
      case 'native':
        try {
          await Share.share({
            title,
            text: title,
            url: shareUrl,
            dialogTitle: 'Share via',
          });
        } catch (error) {
          console.error('Share failed:', error);
        }
        break;

      case 'copy':
        try {
          await Clipboard.write({ string: shareUrl });
          alert('Link copied to clipboard!');
        } catch (error) {
          // Fallback for web
          navigator.clipboard.writeText(shareUrl);
          alert('Link copied to clipboard!');
        }
        break;

      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`, '_blank');
        break;

      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;

      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
        break;

      case 'instagram':
        // Instagram doesn't support direct sharing via URL, copy link instead
        try {
          await Clipboard.write({ string: shareUrl });
          alert('Link copied! Open Instagram and paste in your story or bio.');
        } catch (error) {
          navigator.clipboard.writeText(shareUrl);
          alert('Link copied! Open Instagram and paste in your story or bio.');
        }
        break;

      case 'download':
        if (contentUrl && contentType === 'video') {
          // Download video (for videos only)
          const a = document.createElement('a');
          a.href = contentUrl;
          a.download = `elixstar-video-${contentId}.mp4`;
          a.click();
        }
        break;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-end" onClick={onClose}>
      <div
        className="bg-[#1a1a1a] w-full rounded-t-3xl px-4 py-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Share</h2>
          <button onClick={onClose} className="p-2 hover:brightness-125 rounded-full transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Share Options */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <ShareButton
            icon={<MessageCircle className="w-6 h-6" />}
            label="WhatsApp"
            onClick={() => handleShare('whatsapp')}
            color="bg-green-500"
          />
          <ShareButton
            icon={<Facebook className="w-6 h-6" />}
            label="Facebook"
            onClick={() => handleShare('facebook')}
            color="bg-blue-600"
          />
          <ShareButton
            icon={<Twitter className="w-6 h-6" />}
            label="Twitter"
            onClick={() => handleShare('twitter')}
            color="bg-blue-400"
          />
          <ShareButton
            icon={<Instagram className="w-6 h-6" />}
            label="Instagram"
            onClick={() => handleShare('instagram')}
            color="bg-gradient-to-br from-purple-500 to-pink-500"
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <ActionButton
            icon={<Link className="w-5 h-5" />}
            label="Copy Link"
            onClick={() => handleShare('copy')}
          />
          {contentType === 'video' && contentUrl && (
            <ActionButton
              icon={<Download className="w-5 h-5" />}
              label="Download Video"
              onClick={() => handleShare('download')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ShareButton({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center text-white`}>
        {icon}
      </div>
      <span className="text-xs text-white/80">{label}</span>
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-xl hover:brightness-125 transition"
    >
      <div className="text-white/80">{icon}</div>
      <span className="flex-1 text-left font-semibold">{label}</span>
    </button>
  );
}
