import React from 'react';
import { Play, Pause, Volume2, VolumeX, Settings } from 'lucide-react';

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playbackRate: number;
  quality: 'auto' | '720p' | '1080p';
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onQualityChange: (quality: 'auto' | '720p' | '1080p') => void;
  onSettingsToggle: () => void;
}

export default function VideoControls({
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  playbackRate,
  quality,
  onPlayPause,
  onMuteToggle,
  onVolumeChange,
  onSeek,
  onPlaybackRateChange,
  onQualityChange,
  onSettingsToggle
}: VideoControlsProps) {
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-40">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="relative w-full h-1 bg-transparent30 rounded-full cursor-pointer">
          <div 
            className="absolute top-0 left-0 h-full bg-[#FE2C55] rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `${progress}%`, marginLeft: '-6px' }}
            onMouseDown={(e) => {
              const rect = e.currentTarget.parentElement?.getBoundingClientRect();
              if (!rect) return;
              
              const handleMouseMove = (e: MouseEvent) => {
                const newProgress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(newProgress * duration);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </div>
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between">
        {/* Left Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPause}
            className="p-2 text-white hover:bg-transparent20 rounded-full transition-colors"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onMuteToggle}
              className="p-2 text-white hover:bg-transparent20 rounded-full transition-colors"
            >
              {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-transparent30 rounded-full appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          <div className="text-white text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Playback Speed */}
          <div className="relative group">
            <button className="px-2 py-1 text-white text-sm hover:bg-transparent20 rounded transition-colors">
              {playbackRate}x
            </button>
            <div className="absolute bottom-full right-0 mb-2 bg-black rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => onPlaybackRateChange(rate)}
                  className={`block w-full px-3 py-1 text-left text-sm rounded hover:bg-transparent10 ${
                    playbackRate === rate ? 'text-[#FE2C55]' : 'text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="relative group">
            <button className="px-2 py-1 text-white text-sm hover:bg-transparent20 rounded transition-colors">
              {quality}
            </button>
            <div className="absolute bottom-full right-0 mb-2 bg-black rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
              {['auto', '720p', '1080p'].map((q) => (
                <button
                  key={q}
                  onClick={() => onQualityChange(q as 'auto' | '720p' | '1080p')}
                  className={`block w-full px-3 py-1 text-left text-sm rounded hover:bg-transparent10 ${
                    quality === q ? 'text-[#FE2C55]' : 'text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onSettingsToggle}
            className="p-2 text-white hover:bg-transparent20 rounded-full transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>


    </div>
  );
}