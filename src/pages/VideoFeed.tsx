import React, { useEffect, useRef, useState } from 'react';
import EnhancedVideoPlayer from '../components/EnhancedVideoPlayer';
import { useVideoStore } from '../store/useVideoStore';
import { LivePromo, useLivePromoStore } from '../store/useLivePromoStore';
import { useSafetyStore } from '../store/useSafetyStore';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type HomeTopTab = 'live' | 'stem' | 'explore' | 'following' | 'shop' | 'foryou';

type FeedItem =
  | { kind: 'promo'; promo: LivePromo }
  | { kind: 'video'; videoId: string };

function PromoCard({ promo, onOpen }: { promo: LivePromo; onOpen: () => void }) {
  const previewSrc =
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full h-full relative bg-black"
    >
      {promo.type === 'battle' ? (
        <div className="absolute inset-0 flex">
          <video className="w-1/2 h-full object-cover" src={previewSrc} autoPlay loop muted playsInline />
          <video className="w-1/2 h-full object-cover" src={previewSrc} autoPlay loop muted playsInline />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
        </div>
      ) : (
        <div className="absolute inset-0">
          <video className="w-full h-full object-cover" src={previewSrc} autoPlay loop muted playsInline />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
        </div>
      )}

      <div className="absolute left-4 top-16 z-10 flex items-center gap-2">
        <div className="px-2.5 py-1 rounded-full bg-[#E6B36A] text-black text-[11px] font-black tracking-widest">
          LIVE
        </div>
        <div className="px-2.5 py-1 rounded-full text-[#E6B36A] text-[11px] font-black tracking-widest">
          {promo.type === 'battle' ? 'BATTLE' : 'STREAM'}
        </div>
      </div>

      <div className="absolute left-4 bottom-28 z-10 text-left">
        <p className="text-white text-xl font-black">
          {promo.type === 'battle' ? 'Live Battle' : 'Live Stream'}
        </p>
        <p className="text-[#E6B36A] text-sm font-bold">{promo.likes.toLocaleString()} likes</p>
      </div>

      <div className="absolute left-4 bottom-12 z-10">
        <div className="px-5 py-2 rounded-full bg-[#E6B36A] text-black text-sm font-black">Watch now</div>
      </div>
    </button>
  );
}

export default function VideoFeed() {
  const videos = useVideoStore((s) => s.videos);
  const blockedUserIds = useSafetyStore((s) => s.blockedUserIds);
  const promoBattle = useLivePromoStore((s) => s.promoBattle);
  const promoLive = useLivePromoStore((s) => s.promoLive);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<HomeTopTab>('foryou');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const promos: FeedItem[] =
    activeTab === 'foryou'
      ? [
          ...(promoBattle ? ([{ kind: 'promo', promo: promoBattle }] as const) : []),
          ...(promoLive ? ([{ kind: 'promo', promo: promoLive }] as const) : []),
        ]
      : [];
  const promoCount = promos.length;
  const [loopCount, setLoopCount] = useState(1);

  const visibleVideos = blockedUserIds.length
    ? videos.filter((v) => !blockedUserIds.includes(v.user.id))
    : videos;

  const videoIds = Array.from({ length: loopCount }).flatMap(() => visibleVideos.map((v) => v.id));

  const feedItems: FeedItem[] = [...promos, ...videoIds.map((id) => ({ kind: 'video' as const, videoId: id }))];

  useEffect(() => {
    if (visibleVideos.length === 0) return;
    setActiveIndex(0);
  }, [visibleVideos.length, promoCount]);

  const handleVideoEnd = (feedIndex: number) => {
    const container = containerRef.current;
    if (!container) return;
    if (feedIndex < feedItems.length - 1) {
      container.scrollTo({
        top: (feedIndex + 1) * container.clientHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollPosition = container.scrollTop;
    const height = container.clientHeight;
    
    const index = Math.round(scrollPosition / height);
    if (index < 0 || index >= feedItems.length) return;
    setActiveIndex(index);

    if (scrollPosition + height >= (feedItems.length - 2) * height) {
      setLoopCount((c) => Math.min(20, c + 1));
    }
  };

  const nextItem = feedItems[activeIndex + 1];
  const nextVideoUrl =
    nextItem && nextItem.kind === 'video'
      ? visibleVideos.find((v) => v.id === nextItem.videoId)?.url
      : undefined;

  useEffect(() => {
    if (!nextVideoUrl) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = nextVideoUrl;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [nextVideoUrl]);


  return (
    <div 
      ref={containerRef}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory relative"
      onScroll={handleScroll}
    >
      {/* Top Navigation Bar - LUXURY REDESIGN */}
      <div className="fixed left-0 right-0 top-0 z-[200] flex justify-center pointer-events-none">
        <div className="w-full max-w-[500px] relative px-2 pt-2 pb-1" style={{ transform: 'scaleY(0.75)' }}>
          
          {/* Background Image with Premium Glow */}
          <div className="relative">
            <img 
              src="/Icons/topbar.png" 
              alt="Navigation" 
              className="w-full h-auto pointer-events-none"
              style={{ 
                filter: 'drop-shadow(0 0 20px rgba(230,179,106,0.5)) drop-shadow(0 4px 15px rgba(0,0,0,0.6))',
              }}
            />
            
            {/* Clickable Button Overlays */}
            <div className="absolute inset-0 flex items-center pointer-events-auto">
              {/* LIVE Button - 11% */}
              <button
                onClick={() => { setActiveTab('live'); navigate('/live'); }}
                className="h-full transition-all active:opacity-60 hover:brightness-125 rounded-l-full"
                style={{ width: '11%' }}
                title="Live"
              />
              
              {/* STEM Button - 11% */}
              <button
                onClick={() => { setActiveTab('stem'); navigate('/stem'); }}
                className="h-full transition-all active:opacity-60 hover:brightness-125"
                style={{ width: '11%' }}
                title="STEM"
              />
              
              {/* Explore Button - 14% */}
              <button
                onClick={() => { setActiveTab('explore'); navigate('/discover'); }}
                className="h-full transition-all active:opacity-60 hover:brightness-125"
                style={{ width: '14%' }}
                title="Explore"
              />
              
              {/* Following Button - 17% */}
              <button
                onClick={() => { setActiveTab('following'); navigate('/following'); }}
                className="h-full transition-all active:opacity-60 hover:brightness-125"
                style={{ width: '17%' }}
                title="Following"
              />
              
              {/* Shop Button - 12% */}
              <button
                onClick={() => { setActiveTab('shop'); navigate('/saved'); }}
                className="h-full transition-all active:opacity-60 hover:brightness-125"
                style={{ width: '12%' }}
                title="Shop"
              />
              
              {/* For You Button - 17% */}
              <button
                onClick={() => { setActiveTab('foryou'); navigate('/'); }}
                className="h-full transition-all active:opacity-60 hover:brightness-125"
                style={{ width: '17%' }}
                title="For You"
              />
              
              {/* Search Button - 18% */}
              <button
                onClick={() => navigate('/search')}
                className="h-full transition-all active:opacity-60 hover:brightness-125 rounded-r-full"
                style={{ width: '18%' }}
                title="Search"
              />
            </div>
          </div>
        </div>
      </div>

      {feedItems.map((item, index) => {
        if (item.kind === 'promo') {
          return (
            <div
              key={`promo-${index}`}
              className="h-full w-full snap-start relative flex justify-center bg-black"
            >
              <div className="w-full h-full md:w-[500px] relative">
                <PromoCard
                  promo={item.promo}
                  onOpen={() =>
                    navigate(`/live/${item.promo.streamId}${item.promo.type === 'battle' ? '?battle=1' : ''}`)
                  }
                />
              </div>
            </div>
          );
        }

        return (
          <div key={`video-${index}`} className="h-[100dvh] w-full snap-start relative flex justify-center">
            <div className="w-full h-[100dvh] md:w-[500px] relative" style={{ paddingBottom: '52px' }}>
              <EnhancedVideoPlayer
                videoId={item.videoId}
                isActive={activeIndex === index}
                onVideoEnd={() => handleVideoEnd(index)}
              />
            </div>
          </div>
        );
      })}

      {nextVideoUrl && (
        <video
          src={nextVideoUrl}
          preload="auto"
          muted
          playsInline
          className="hidden"
        />
      )}
    </div>
  );
}
