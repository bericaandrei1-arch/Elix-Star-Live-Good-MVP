import React, { useState } from 'react';
import { 
  X, 
  Link, 
  Download, 
  Mail, 
  MessageCircle,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Check,
  Share2,
  QrCode,
  Code
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    url: string;
    thumbnail?: string;
    description: string;
    user: {
      username: string;
    };
    stats: {
      likes: number;
      comments: number;
    };
  };
}

const sharePlatforms = [
  {
    name: 'Copy Link',
    icon: Link,
    color: 'bg-gray-600 hover:bg-gray-700',
    action: 'copy'
  },
  {
    name: 'Messages',
    icon: MessageCircle,
    color: 'bg-green-600 hover:bg-green-700',
    action: 'sms'
  },
  {
    name: 'Email',
    icon: Mail,
    color: 'bg-red-600 hover:bg-red-700',
    action: 'email'
  },
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-green-500 hover:bg-green-600',
    action: 'whatsapp'
  },
  {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600 hover:bg-blue-700',
    action: 'facebook'
  },
  {
    name: 'Twitter',
    icon: Twitter,
    color: 'bg-blue-400 hover:bg-blue-500',
    action: 'twitter'
  },
  {
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600',
    action: 'instagram'
  },
  {
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-600 hover:bg-red-700',
    action: 'youtube'
  }
];

export default function ShareModal({ isOpen, onClose, video }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);

  if (!isOpen) return null;

  const videoUrl = `${window.location.origin}/video/${video.id}`;
  const shareText = `Check out this amazing video by @${video.user.username}: ${video.description}`;

  const handleShare = async (platform: string) => {
    try {
      switch (platform) {
        case 'copy':
          await navigator.clipboard.writeText(videoUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
          break;
          
        case 'sms':
          window.open(`sms:?body=${encodeURIComponent(shareText + ' ' + videoUrl)}`);
          break;
          
        case 'email':
          window.open(`mailto:?subject=Check out this video&body=${encodeURIComponent(shareText + '\n\n' + videoUrl)}`);
          break;
          
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + videoUrl)}`);
          break;
          
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(videoUrl)}&quote=${encodeURIComponent(shareText)}`);
          break;
          
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(videoUrl)}`);
          break;
          
        case 'instagram':
          // Instagram doesn't allow direct sharing via URL, copy to clipboard instead
          await navigator.clipboard.writeText(shareText + ' ' + videoUrl);
          alert('Caption copied to clipboard! You can now paste it in your Instagram story or post.');
          break;
          
        case 'youtube':
          // YouTube doesn't allow direct sharing, copy to clipboard instead
          await navigator.clipboard.writeText(shareText + ' ' + videoUrl);
          alert('Video link copied to clipboard!');
          break;
          
        default:
          if (navigator.share) {
            await navigator.share({
              title: `Video by @${video.user.username}`,
              text: shareText,
              url: videoUrl,
            });
          } else {
            await navigator.clipboard.writeText(videoUrl);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
          }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to copying link
      try {
        await navigator.clipboard.writeText(videoUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
      }
    }
  };

  const generateQRCode = () => {
    // In a real app, you'd use a QR code library
    // For now, we'll just show a placeholder
    setShowQRCode(true);
  };

  const generateEmbedCode = () => {
    const embedCode = `<iframe src="${videoUrl}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode);
    alert('Embed code copied to clipboard!');
  };

  const handleDownload = async () => {
    try {
      // In a real app, you'd have a proper download endpoint
      const link = document.createElement('a');
      link.href = video.url;
      link.download = `video_${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Download failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black flex items-center justify-center p-4">
      <div className="bg-[#121212] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-transparent">
          <div className="flex items-center gap-3">
            <Share2 className="w-5 h-5 text-[#FE2C55]" />
            <h3 className="text-white font-semibold">Share Video</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Video Preview */}
        <div className="p-4 border-b border-transparent">
          <div className="flex gap-3">
            <img 
              src={video.thumbnail || `https://picsum.photos/80/120?random=${video.id}`} 
              alt="Video thumbnail" 
              className="w-20 h-28 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium line-clamp-2 mb-1">{video.description}</h4>
              <p className="text-white/60 text-sm mb-2">@{video.user.username}</p>
              <div className="flex items-center gap-3 text-white/40 text-xs">
                <span>{video.stats.likes.toLocaleString()} likes</span>
                <span>•</span>
                <span>{video.stats.comments.toLocaleString()} comments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Quick Share Buttons */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {sharePlatforms.map((platform) => (
              <button
                key={platform.name}
                onClick={() => handleShare(platform.action)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${platform.color}`}
              >
                {platform.action === 'copy' && copiedLink ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <platform.icon className="w-6 h-6 text-white" />
                )}
                <span className="text-white text-xs text-center">{platform.name}</span>
              </button>
            ))}
          </div>

          {/* Additional Options */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-3 p-3 hover:brightness-125 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5 text-white" />
              <span className="text-white">Download Video</span>
            </button>

            <button
              onClick={generateQRCode}
              className="w-full flex items-center gap-3 p-3 hover:brightness-125 rounded-lg transition-colors"
            >
              <QrCode className="w-5 h-5 text-white" />
              <span className="text-white">Generate QR Code</span>
            </button>

            <button
              onClick={generateEmbedCode}
              className="w-full flex items-center gap-3 p-3 hover:brightness-125 rounded-lg transition-colors"
            >
              <Code className="w-5 h-5 text-white" />
              <span className="text-white">Copy Embed Code</span>
            </button>
          </div>

          {/* Custom Message */}
          <div className="mt-4">
            <label className="text-white/80 text-sm mb-2 block">Add a message (optional)</label>
            <textarea
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              placeholder="Say something about this video..."
              className="w-full bg-white text-white rounded-lg p-3 text-sm focus:outline-none focus:bg-black resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* QR Code Modal */}
        {showQRCode && (
          <div className="fixed inset-0 z-[600] bg-black flex items-center justify-center p-4">
            <div className="bg-[#121212] rounded-2xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-semibold">QR Code</h4>
                <button onClick={() => setShowQRCode(false)} className="text-white/70 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                <div className="w-48 h-48 bg-gray-300 rounded flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-gray-600" />
                </div>
              </div>
              <p className="text-white/60 text-sm text-center mt-3">
                Scan this QR code to view the video
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}