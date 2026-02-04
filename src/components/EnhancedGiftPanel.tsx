import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gift, Coins } from 'lucide-react';
import { IS_STORE_BUILD } from '@/config/build';
import { BuyCoinsModal } from './BuyCoinsModal';

import { GIFTS as BASE_GIFTS } from './GiftPanel';
import { fetchGiftPriceMap } from '../lib/giftsCatalog';
import { getPosterCandidatesFromVideoSrc, pickFirstPosterCandidate } from '../lib/giftPoster';

export const GIFTS = BASE_GIFTS;

interface GiftPanelProps {
  onSelectGift: (gift: typeof GIFTS[0]) => void;
  userCoins: number;
  onRechargeSuccess?: (newBalance: number) => void;
}

function useInView<T extends Element>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

function isImageUrl(url: string) {
  return /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url);
}

const GiftVideo: React.FC<{ src: string; poster?: string; active: boolean }> = ({ src, poster, active }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [posterFailed, setPosterFailed] = useState<Set<string>>(() => new Set());
  const posterCandidates = useMemo(() => getPosterCandidatesFromVideoSrc(src), [src]);
  // Use 'poster' prop as the first fallback if provided, to avoid black screen
  const resolvedPoster = poster ?? posterCandidates.find((p) => !posterFailed.has(p)) ?? pickFirstPosterCandidate(src);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (failed) {
      el.pause();
      return;
    }

    if (!active) {
      el.pause();
      return;
    }

    el.play().catch(() => {});
  }, [active, failed]);

  const stillImage = poster ?? resolvedPoster;

  return (
    <>
      {stillImage ? (
        <img
          src={stillImage}
          alt=""
          className="w-full h-full object-contain p-1 pointer-events-none absolute inset-0 z-10"
          onError={() => {
            if (!resolvedPoster) return;
            setPosterFailed((prev) => new Set(prev).add(resolvedPoster));
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center pointer-events-none absolute inset-0 z-10">
          <span className="text-2xl">🎁</span>
        </div>
      )}
      
      {active && !failed && !stillImage && (
        <video
          ref={videoRef}
          src={src}
          poster={resolvedPoster ?? poster}
          className={`w-full h-full object-contain p-1 pointer-events-none ${loaded ? '' : 'opacity-0'}`}
          muted
          loop
          playsInline
          preload="auto"
          // Removed crossOrigin="anonymous" to allow opaque response (playing without CORS headers)
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
          onError={(e) => {
            console.error('Video error:', e);
            setFailed(true);
          }}
        />
      )}
    </>
  );
};

export function EnhancedGiftPanel({ onSelectGift, userCoins, onRechargeSuccess }: GiftPanelProps) {
  const [activeTab, setActiveTab] = useState<'exclusive' | 'small' | 'big'>('big');
  const [activeGiftId, setActiveGiftId] = useState<string | null>(null);
  const [poppedGiftId, setPoppedGiftId] = useState<string | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);
  const { ref: panelRef, inView } = useInView<HTMLDivElement>({ root: null, threshold: 0.05 });
  const [giftPriceMap, setGiftPriceMap] = useState<Map<string, number>>(() => new Map());
  const catalogGifts = GIFTS;

  useEffect(() => {
    fetchGiftPriceMap()
      .then((map) => setGiftPriceMap(map))
      .catch(() => {});
  }, []);

  // useEffect(() => {
  //   fetchGiftCatalog()
  //     .then((rows) => {
  //       if (!rows || rows.length === 0) return;
  //       const uiItems = buildGiftUiItemsFromCatalog(rows);
  //       if (uiItems.length > 0) {
  //         setCatalogGifts(uiItems as any);
  //       }
  //     })
  //     .catch(() => {});
  // }, []);

  const giftsWithPrices = useMemo(
    () =>
      catalogGifts.map((gift) => ({
        ...gift,
        coins: giftPriceMap.get(gift.id) ?? gift.coins,
      })),
    [catalogGifts, giftPriceMap]
  );

  const universeGift = useMemo(() => giftsWithPrices.find((g) => g.giftType === 'universe'), [giftsWithPrices]);
  const bigGifts = useMemo(() => giftsWithPrices.filter((g) => g.giftType === 'big'), [giftsWithPrices]);
  const smallGifts = useMemo(() => giftsWithPrices.filter((g) => g.giftType === 'small'), [giftsWithPrices]);

  const posterByGiftId = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const g of [universeGift, ...bigGifts, ...smallGifts].filter(Boolean) as typeof GIFTS) {
      map.set(g.id, isImageUrl(g.preview) ? g.preview : isImageUrl(g.icon) ? g.icon : undefined);
    }
    return map;
  }, [bigGifts, smallGifts, universeGift]);

  useEffect(() => {
    if (!inView) return;
    const first = activeTab === 'exclusive' ? (universeGift ?? bigGifts[0]) : smallGifts[0];
    if (!first) return;
    setActiveGiftId((prev) => prev ?? first.id);
  }, [bigGifts, inView, universeGift, smallGifts, activeTab]);

  return (
    <div ref={panelRef} className="bg-[#1a1a1a]/95  rounded-t-3xl p-2 pb-3 max-h-[calc(28vh+42px)] overflow-y-auto no-scrollbar border-t-2 border-l-2 border-r-2 border-transparent shadow-2xl animate-slide-up w-full" style={{ borderImage: 'linear-gradient(to right, #8B0000, #00008B) 1' }}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-secondary font-bold text-base flex items-center gap-2">
          <Gift className="text-secondary" size={18} /> 
          Send a Gift
        </h3>
        <div className="flex items-center gap-2 bg-black px-2.5 py-0.5 rounded-full border border-secondary/20">
          <Coins size={13} className="text-secondary" />
          <span className="text-secondary font-bold text-xs">{userCoins.toLocaleString()}</span>
          {!IS_STORE_BUILD && (
            <button 
              onClick={() => setShowRecharge(true)}
              className="bg-secondary text-black text-[9px] font-bold px-1.5 py-0.5 rounded ml-2 hover:bg-white transition"
            >
              Top Up
            </button>
          )}
        </div>
      </div>

      <BuyCoinsModal
        isOpen={showRecharge}
        onClose={() => setShowRecharge(false)}
        onSuccess={(coins) => {
          if (onRechargeSuccess) onRechargeSuccess(userCoins + coins);
        }}
      />

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-3 px-2 border-b border-transparent">
        <button 
            className={`text-sm font-bold pb-2 transition-colors relative ${activeTab === 'small' ? 'text-secondary' : 'text-white/50 hover:text-white/80'}`}
            onClick={() => setActiveTab('small')}
        >
            Small Gift
            {activeTab === 'small' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary rounded-t-full" />}
        </button>
        <button 
            className={`text-sm font-bold pb-2 transition-colors relative ${activeTab === 'exclusive' ? 'text-secondary' : 'text-white/50 hover:text-white/80'}`}
            onClick={() => setActiveTab('exclusive')}
        >
            Exclusive Gift
            {activeTab === 'exclusive' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary rounded-t-full" />}
        </button>
        <button 
            className={`text-sm font-bold pb-2 transition-colors relative ${activeTab === 'big' ? 'text-secondary' : 'text-white/50 hover:text-white/80'}`}
            onClick={() => setActiveTab('big')}
        >
            Big Gift
            {activeTab === 'big' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-secondary rounded-t-full" />}
        </button>
      </div>

      {activeTab === 'exclusive' && (
        <div className="animate-fade-in">
          {universeGift && (
            <div className="mb-4">
              <div className="grid grid-cols-4 gap-2">
                <button
                  key={universeGift.id}
                  onClick={() => {
                    setActiveGiftId(universeGift.id);
                    setPoppedGiftId(universeGift.id);
                    window.setTimeout(() => setPoppedGiftId((v) => (v === universeGift.id ? null : v)), 520);
                    onSelectGift(universeGift);
                  }}
                  onMouseEnter={() => setActiveGiftId(universeGift.id)}
                  onMouseLeave={() => setActiveGiftId((v) => (v === universeGift.id ? null : v))}
                  className="group flex flex-col items-center gap-1.5 p-1 rounded-xl hover:brightness-125 border border-secondary/30 transition-all duration-300 active:scale-95 relative overflow-hidden"
                >
                  <div
                    className={[
                      "w-full aspect-square flex items-center justify-center bg-black rounded-2xl shadow-inner group-hover:shadow-secondary/20 transition-all overflow-hidden relative elix-gift-idle border border-transparent",
                      poppedGiftId === universeGift.id ? "elix-gift-pop" : "",
                    ].join(" ")}
                  >
                    <GiftVideo
                      src={universeGift.video}
                      poster={posterByGiftId.get(universeGift.id)}
                      active={inView && activeGiftId === universeGift.id}
                    />
                    <div className="elix-gift-sparkle" />
                  </div>
                  <div className="text-center z-10">
                    <p className="text-[10px] text-white/90 font-medium truncate w-full mb-0.5 group-hover:text-white">
                      {universeGift.name}
                    </p>
                    <div className="flex items-center justify-center gap-1">
                      <Coins size={9} className="text-secondary" />
                      <p className="text-[10px] text-secondary font-bold">{universeGift.coins.toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'big' && (
        <div className="animate-fade-in">
          <div>
            <div className="grid grid-cols-4 gap-2">
              {bigGifts.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => {
                    setActiveGiftId(gift.id);
                    setPoppedGiftId(gift.id);
                    window.setTimeout(() => setPoppedGiftId((v) => (v === gift.id ? null : v)), 520);
                    onSelectGift(gift);
                  }}
                  onMouseEnter={() => setActiveGiftId(gift.id)}
                  onMouseLeave={() => setActiveGiftId((v) => (v === gift.id ? null : v))}
                  className="group flex flex-col items-center gap-1.5 p-1 rounded-xl hover:brightness-125 border border-transparent hover:border-secondary/30 transition-all duration-300 active:scale-95 relative overflow-hidden"
                >
                  <div
                    className={[
                      "w-full aspect-square flex items-center justify-center bg-black rounded-2xl shadow-inner group-hover:shadow-secondary/20 transition-all overflow-hidden relative elix-gift-idle border border-transparent",
                      poppedGiftId === gift.id ? "elix-gift-pop" : "",
                    ].join(" ")}
                  >
                    <GiftVideo src={gift.video} poster={posterByGiftId.get(gift.id)} active={inView && activeGiftId === gift.id} />
                    <div className="elix-gift-sparkle" />
                  </div>
                  <div className="text-center z-10">
                    <p className="text-[10px] text-white/90 font-medium truncate w-full mb-0.5 group-hover:text-white">{gift.name}</p>
                    <div className="flex items-center justify-center gap-1">
                      <Coins size={9} className="text-secondary" />
                      <p className="text-[10px] text-secondary font-bold">{gift.coins.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity pointer-events-none" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'small' && smallGifts.length > 0 && (
        <div className="mt-2 animate-fade-in">
          <div className="grid grid-cols-4 gap-2">
            {smallGifts.map((gift) => (
              <button
                key={gift.id}
                onClick={() => {
                  setActiveGiftId(gift.id);
                  setPoppedGiftId(gift.id);
                  window.setTimeout(() => setPoppedGiftId((v) => (v === gift.id ? null : v)), 520);
                  onSelectGift(gift);
                }}
                onMouseEnter={() => setActiveGiftId(gift.id)}
                onMouseLeave={() => setActiveGiftId((v) => (v === gift.id ? null : v))}
                className="group flex flex-col items-center gap-1.5 p-1 rounded-xl hover:brightness-125 border border-transparent hover:border-secondary/30 transition-all duration-300 active:scale-95 relative overflow-hidden"
              >
                <div
                  className={[
                    "w-full aspect-square flex items-center justify-center bg-white rounded-2xl shadow-inner group-hover:shadow-secondary/20 transition-all overflow-hidden relative elix-gift-idle border border-transparent",
                    poppedGiftId === gift.id ? "elix-gift-pop" : "",
                  ].join(" ")}
                >
                  <img
                    src={gift.icon}
                    alt=""
                    className="w-full h-full object-contain p-1 pointer-events-none"
                  />
                  <div className="elix-gift-sparkle" />
                </div>
                <div className="text-center z-10">
                  <p className="text-[10px] text-white/90 font-medium truncate w-full mb-0.5 group-hover:text-white">{gift.name}</p>
                  <div className="flex items-center justify-center gap-1">
                    <Coins size={9} className="text-secondary" />
                    <p className="text-[10px] text-secondary font-bold">{gift.coins.toLocaleString()}</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity pointer-events-none" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Keep original for backward compatibility
export { EnhancedGiftPanel as GiftPanel };
