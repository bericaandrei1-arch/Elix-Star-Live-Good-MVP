import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Send,
  UsersRound,
  Search,
  Heart,
  Flame,
  Link2,
  MessageCircle,
  Share2,
  RefreshCw,
  Mic,
  MicOff,
  Settings2,
  LogOut,
  Power,
  ShoppingBag,
  Pencil,
  MoreHorizontal,
  Gift,
  MoreVertical,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GiftPanel, GIFTS } from '../components/EnhancedGiftPanel';
import { GiftOverlay } from '../components/GiftOverlay';
import { ChatOverlay } from '../components/ChatOverlay';
import { FaceARGift } from '../components/FaceARGift';
import { useLivePromoStore } from '../store/useLivePromoStore';
import { useAuthStore } from '../store/useAuthStore';
import { clearCachedCameraStream, getCachedCameraStream } from '../lib/cameraStream';
import { supabase } from '../lib/supabase';
import { useRealApi } from '../lib/apiFallback';
import { LevelBadge } from '../components/LevelBadge';

type LiveMessage = {
  id: string;
  username: string;
  text: string;
  level?: number;
  isGift?: boolean;
  avatar?: string;
  isSystem?: boolean;
};

type UniverseTickerMessage = {
  id: string;
  sender: string;
  receiver: string;
};

// Mock messages for simulation
const MOCK_MESSAGES = [
    { id: '1', username: 'alex_cool', text: 'This is amazing! 🔥', level: 12, avatar: 'https://ui-avatars.com/api/?name=alex_cool&background=random' },
    { id: '2', username: 'sarah_j', text: 'Love the vibe ❤️', level: 25, avatar: 'https://ui-avatars.com/api/?name=sarah_j&background=random' },
    { id: '3', username: 'gamer_pro', text: 'Play that song again!', level: 5, avatar: 'https://ui-avatars.com/api/?name=gamer_pro&background=random' },
    { id: '4', username: 'music_lover', text: 'Hello from Brazil 🇧🇷', level: 42, avatar: 'https://ui-avatars.com/api/?name=music_lover&background=random' },
];

export default function LiveStream() {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const opponentVideoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const setPromo = useLivePromoStore((s) => s.setPromo);
  const updateUser = useAuthStore((s) => s.updateUser);
  const effectiveStreamId = streamId || 'broadcast';
  const PROMOTE_LIKES_THRESHOLD_LIVE = 10_000;
  const _PROMOTE_LIKES_THRESHOLD_BATTLE = 5_000;
  
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [currentGift, setCurrentGift] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [coinBalance, setCoinBalance] = useState(useRealApi ? 0 : 999999999);
  const [inputValue, setInputValue] = useState('');
  const isBroadcast = streamId === 'broadcast';
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isLiveSettingsOpen, setIsLiveSettingsOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const user = useAuthStore((s) => s.user);
  const formatStreamName = (id: string) =>
    id
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  const creatorName = isBroadcast
    ? user?.name || user?.username || 'Andrei Ionut Berica'
    : streamId
      ? formatStreamName(streamId)
      : 'ELIX STAR';
  const myCreatorName = creatorName;
  const myAvatar = isBroadcast
    ? user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorName)}&background=random`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorName)}&background=random`;
  const [opponentCreatorName, setOpponentCreatorName] = useState('Paul');
  const viewerName = user?.username || user?.name || 'viewer_123';
  const viewerAvatar =
    user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(viewerName)}&background=random`;
  const universeGiftLabel = 'Universe';

  // FaceAR State
  const faceARCanvasRef = useRef<HTMLCanvasElement>(null);
  const [_faceARVideoEl, setFaceARVideoEl] = useState<HTMLVideoElement | null>(null);
  const [_faceARCanvasEl, setFaceARCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [battleGiftIconFailed, setBattleGiftIconFailed] = useState(false);

  useEffect(() => {
    if (videoRef.current) setFaceARVideoEl(videoRef.current);
    if (faceARCanvasRef.current) setFaceARCanvasEl(faceARCanvasRef.current);
  }, [isBroadcast]);

  useEffect(() => {
    if (!useRealApi || !user?.id) return;
    let cancelled = false;

    const run = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('coin_balance,level,xp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled && data?.coin_balance != null) {
        setCoinBalance(Number(data.coin_balance));
        if (data.level != null) setUserLevel(Number(data.level));
        if (data.xp != null) setUserXP(Number(data.xp));
        if (data.level != null) updateUser({ level: Number(data.level) });
      }

      // DEV BACKDOOR: Force max coins for everyone
      if (user) {
          setCoinBalance(999999999);
      } else if (!cancelled && data?.coin_balance != null) {
          return;
      }

      if (error) {
        return;
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, coin_balance: 0, level: 1, xp: 0 });

      if (insertError) {
        const code = (insertError as unknown as { code?: string }).code;
        const msg = insertError.message.toLowerCase();
        if (code !== '23505' && !msg.includes('duplicate') && !msg.includes('already exists')) {
          return;
        }
      }
      const retry = await supabase
        .from('profiles')
        .select('coin_balance,level,xp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled && retry.data?.coin_balance != null) {
        setCoinBalance(Number(retry.data.coin_balance));
        if (retry.data.level != null) setUserLevel(Number(retry.data.level));
        if (retry.data.xp != null) setUserXP(Number(retry.data.xp));
        if (retry.data.level != null) updateUser({ level: Number(retry.data.level) });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [updateUser, user?.id]);

  useEffect(() => {
    if (!useRealApi || !user?.id) return;
    const key = effectiveStreamId;
    if (!key) return;

    (async () => {
      const { error } = await supabase.from('live_streams').upsert(
        {
          stream_key: key,
          user_id: user.id,
          title: creatorName,
          is_live: true,
        },
        { onConflict: 'stream_key' }
      );
      if (error) {
        setMessages((prev) => [
          ...prev.slice(-10),
          { id: Date.now().toString(), username: 'system', text: 'Live status update failed.' },
        ]);
      }
    })();
  }, [creatorName, effectiveStreamId, user?.id]);

  // Refresh coins when gift panel opens to ensure balance is up to date
  useEffect(() => {
    if (showGiftPanel && useRealApi && user?.id) {
      supabase
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.coin_balance != null) {
            setCoinBalance(Number(data.coin_balance));
          }
        });
    }
  }, [showGiftPanel, user?.id]);

  const [isFindCreatorsOpen, setIsFindCreatorsOpen] = useState(false);
  const [creatorQuery, setCreatorQuery] = useState('');

  const creators = [
    { id: 'c1', name: 'Paul', followers: '1.2M' },
    { id: 'c2', name: 'Maria Pop', followers: '842K' },
    { id: 'c3', name: 'John Live', followers: '510K' },
    { id: 'c4', name: 'Alex Cool', followers: '2.1M' },
    { id: 'c5', name: 'Sarah J', followers: '976K' },
  ];

  const filteredCreators = creators.filter((c) => c.name.toLowerCase().includes(creatorQuery.trim().toLowerCase()));
  
  // Battle Mode State
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [battleTime, setBattleTime] = useState(300); // 5 minutes
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [battleWinner, setBattleWinner] = useState<'me' | 'opponent' | 'draw' | null>(null);
  const [giftTarget, setGiftTarget] = useState<'me' | 'opponent'>('me');
  const lastScreenTapRef = useRef<number>(0);
  const battleTapScoreRemainingRef = useRef<number>(5);
  const [_battleTapScoreRemaining, setBattleTapScoreRemaining] = useState(5);
  const battleScoreTapWindowRef = useRef<{ windowStart: number; count: number }>({ windowStart: 0, count: 0 });
  const battleTripleTapRef = useRef<{ target: 'me' | 'opponent' | null; lastTapAt: number; count: number }>({
    target: null,
    lastTapAt: 0,
    count: 0,
  });
  const [battleCountdown, setBattleCountdown] = useState<number | null>(null);
  const _battleKeyboardLikeArmedRef = useRef(true);
  const [liveLikes, setLiveLikes] = useState(0);
  const [_battleGifterCoins, setBattleGifterCoins] = useState<Record<string, number>>({});
  const [floatingHearts, setFloatingHearts] = useState<
    Array<{ id: string; x: number; y: number; dx: number; rot: number; size: number; color: string }>
  >([]);
  const [miniProfile, setMiniProfile] = useState<null | { username: string; avatar: string; level: number | null; coins?: number }>(null);
  const [universeQueue, setUniverseQueue] = useState<UniverseTickerMessage[]>([]);
  const [currentUniverse, setCurrentUniverse] = useState<UniverseTickerMessage | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBattleMode && battleTime > 0) {
      interval = setInterval(() => {
        setBattleTime(prev => {
            if (prev <= 1) {
                const winner = myScore === opponentScore ? 'draw' : myScore > opponentScore ? 'me' : 'opponent';
                setBattleWinner(winner);
                return 0;
            }
            // Simulate opponent score randomly
            if (Math.random() > 0.7) {
                setOpponentScore(s => s + Math.floor(Math.random() * 50));
            }
            return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBattleMode, battleTime, myScore, opponentScore]);

  const toggleBattle = useCallback(() => {
    if (isBattleMode) {
      setIsBattleMode(false);
      setBattleTime(300);
      setBattleWinner(null);
      setBattleCountdown(null);
      battleScoreTapWindowRef.current = { windowStart: 0, count: 0 };
      battleTripleTapRef.current = { target: null, lastTapAt: 0, count: 0 };
      setMiniProfile(null);
      return;
    }
    setIsBattleMode(true);
    setBattleTime(0);
    setMyScore(0);
    setOpponentScore(0);
    setBattleWinner(null);
    setGiftTarget('me');
    setShowGiftPanel(false);
    battleTapScoreRemainingRef.current = 5;
    setBattleTapScoreRemaining(5);
    setBattleGifterCoins({});
    setBattleCountdown(3);
    battleScoreTapWindowRef.current = { windowStart: 0, count: 0 };
    battleTripleTapRef.current = { target: null, lastTapAt: 0, count: 0 };
  }, [isBattleMode]);

  useEffect(() => {
    if (!isBattleMode) return;
    if (battleCountdown == null) return;

    const tick = window.setInterval(() => {
      setBattleCountdown((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          window.clearInterval(tick);
          setBattleTime(180);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [isBattleMode, battleCountdown]);

  const startBattleWithCreator = (creatorName: string) => {
    setOpponentCreatorName(creatorName);
    setIsFindCreatorsOpen(false);
    setCreatorQuery('');
    const params = new URLSearchParams(location.search);
    params.set('battle', '1');
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
    if (!isBattleMode) {
      toggleBattle();
    }
  };

  useEffect(() => {
    if (currentUniverse || universeQueue.length === 0) return;
    const next = universeQueue[0];
    setCurrentUniverse(next);
    setUniverseQueue((prev) => prev.slice(1));
  }, [currentUniverse, universeQueue]);

  // Auto-clear universe message
  useEffect(() => {
    if (!currentUniverse) return;
    const timer = setTimeout(() => {
      setCurrentUniverse(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentUniverse]);

  const enqueueUniverse = (sender: string) => {
    const receiver = isBattleMode
      ? giftTarget === 'me'
      ? myCreatorName
      : opponentCreatorName
      : myCreatorName;

    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setUniverseQueue((prev) => {
      const next = [...prev, { id, sender, receiver }];
      return next.slice(-12);
    });
  };

  const maybeEnqueueUniverse = (giftName: string, sender: string) => {
    if (!/univ/i.test(giftName)) return;
    enqueueUniverse(sender);
  };

  const addLiveLikes = (delta: number) => {
    if (delta <= 0) return;

    setLiveLikes((prev) => {
      const next = prev + delta;
      if (prev < PROMOTE_LIKES_THRESHOLD_LIVE && next >= PROMOTE_LIKES_THRESHOLD_LIVE) {
        setPromo({
          type: isBattleMode ? 'battle' : 'live',
          streamId: effectiveStreamId,
          likes: next,
          createdAt: Date.now(),
        });
      }
      return next;
    });
  };

  const awardBattlePoints = (target: 'me' | 'opponent', points: number) => {
    if (!isBattleMode || battleTime <= 0 || battleWinner) return;
    if (target === 'me') {
      setMyScore((prev) => prev + points);
    } else {
      setOpponentScore((prev) => prev + points);
    }
  };

  const addBattleGifterCoins = (username: string, coins: number) => {
    if (!isBattleMode) return;
    if (!username || coins <= 0) return;
    setBattleGifterCoins((prev) => ({ ...prev, [username]: (prev[username] ?? 0) + coins }));
  };

  const formatCoinsShort = (coins: number) => {
    if (coins >= 1000) {
      const k = Math.round((coins / 1000) * 10) / 10;
      const label = Number.isInteger(k) ? String(Math.trunc(k)) : String(k);
      return `${label}K`;
    }
    return coins.toLocaleString();
  };

  const spawnHeartAt = useCallback((x: number, y: number, colorOverride?: string) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const dx = Math.round((Math.random() * 2 - 1) * 48);
    const rot = Math.round((Math.random() * 2 - 1) * 18);
    const size = Math.round(16 + Math.random() * 10);
    const colors = ['#E6B36A', '#F4C2C2', '#FFFFFF'];
    const color = colorOverride ?? colors[Math.floor(Math.random() * colors.length)];

    setFloatingHearts((prev) => [...prev.slice(-28), { id, x, y, dx, rot, size, color }]);
    window.setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 950);
  }, []);

  const spawnHeartFromClient = (clientX: number, clientY: number, colorOverride?: string) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    spawnHeartAt(clientX - rect.left, clientY - rect.top, colorOverride);
  };

  const spawnHeartAtSide = useCallback((target: 'me' | 'opponent') => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = rect.width * (target === 'me' ? 0.25 : 0.75);
    const y = rect.height * 0.62;
    spawnHeartAt(x, y, '#FF2D55');
  }, [spawnHeartAt]);

  const handleBattleTap = useCallback((target: 'me' | 'opponent') => {
    setGiftTarget(target);
    // Likes disconnected from battle tap/shortcuts
  }, []);

  useEffect(() => {
    if (!isBattleMode) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (battleWinner) return;

      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement) {
        const tag = activeEl.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || activeEl.isContentEditable) return;
      }

      const key = e.key;
      const code = e.code;

      if (key === 'ArrowLeft' || key === 'a' || key === 'A' || code === 'Numpad4') {
        e.preventDefault();
        handleBattleTap('me');
        spawnHeartAtSide('me');
        addLiveLikes(1);
        return;
      }

      if (key === 'ArrowRight' || key === 'd' || key === 'D' || code === 'Numpad6') {
        e.preventDefault();
        handleBattleTap('opponent');
        spawnHeartAtSide('opponent');
        addLiveLikes(1);
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBattleMode, battleWinner, handleBattleTap, spawnHeartAtSide]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldStartBattle = params.get('battle') === '1';
    if (shouldStartBattle && !isBattleMode) {
      toggleBattle();
    }
  }, [location.search, isBattleMode, toggleBattle]);

  useEffect(() => {
    const sampleLeft = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
    const sampleRight = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

    if (isBattleMode) {
      if (videoRef.current && !isBroadcast) {
        if (videoRef.current.src !== sampleLeft) videoRef.current.src = sampleLeft;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }

      if (opponentVideoRef.current) {
        if (opponentVideoRef.current.src !== sampleRight) opponentVideoRef.current.src = sampleRight;
        opponentVideoRef.current.muted = true;
        opponentVideoRef.current.play().catch(() => {});
      }
    }

    if (!isBroadcast) return;

    let cancelled = false;

    let keepStreamAliveOnCleanup = false;

    const stop = () => {
      const current = cameraStreamRef.current;
      if (!current) return;
      current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    };

    const start = async () => {
      try {
        setCameraError(null);

        if (cameraFacing !== 'user') {
          clearCachedCameraStream();
        }

        const cached = getCachedCameraStream();
        if (cached) {
          keepStreamAliveOnCleanup = true;
          cameraStreamRef.current = cached;
          cached.getAudioTracks().forEach((t) => (t.enabled = !isMicMuted));
          if (videoRef.current) {
            videoRef.current.srcObject = cached;
            videoRef.current.play().catch(() => {});
          }
          return;
        }

        stop();

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1080 },
              height: { ideal: 1920 },
              facingMode: cameraFacing,
            },
            audio: true,
          });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1080 },
                height: { ideal: 1920 },
                facingMode: cameraFacing,
              },
              audio: false,
            });
          } catch {
            setCameraError('Camera access denied');
            return;
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        cameraStreamRef.current = stream;
        stream.getAudioTracks().forEach((t) => (t.enabled = !isMicMuted));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        setCameraError('Camera access denied');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (!keepStreamAliveOnCleanup) stop();
    };
  }, [isBattleMode, isBroadcast, cameraFacing]);

  useEffect(() => {
    const stream = cameraStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !isMicMuted));
  }, [isMicMuted]);

  // Simulate incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
        const randomMsg = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
        const newMsg = { ...randomMsg, id: Date.now().toString() };
        setMessages(prev => [...prev.slice(-10), newMsg]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [giftQueue, setGiftQueue] = useState<string[]>([]);
  const [isPlayingGift, setIsPlayingGift] = useState(false);
  const [lastSentGift, setLastSentGift] = useState<typeof GIFTS[0] | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [userXP, setUserXP] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  const [showComboButton, setShowComboButton] = useState(false);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeFaceARGift, setActiveFaceARGift] = useState<
    | { type: 'crown' | 'glasses' | 'mask' | 'ears' | 'hearts' | 'stars'; color?: string }
    | null
  >(null);

  const maybeTriggerFaceARGift = (gift: typeof GIFTS[0]) => {
    const mapping: Record<string, { type: 'crown' | 'glasses' | 'mask' | 'ears' | 'hearts' | 'stars'; color?: string } | undefined> = {
      face_ar_crown: { type: 'crown', color: '#FFD700' },
      face_ar_glasses: { type: 'glasses', color: '#00D4FF' },
      face_ar_hearts: { type: 'hearts', color: '#FF3B7A' },
      face_ar_mask: { type: 'mask', color: '#7C3AED' },
      face_ar_ears: { type: 'ears', color: '#22C55E' },
      face_ar_stars: { type: 'stars', color: '#F59E0B' },
    };

    const next = mapping[gift.id];
    if (!next) return;
    setActiveFaceARGift(next);
  };

  // Queue Processing
  useEffect(() => {
    if (!isPlayingGift && giftQueue.length > 0) {
        const nextGift = giftQueue[0];
        setCurrentGift(nextGift);
        setIsPlayingGift(true);
        setGiftQueue(prev => prev.slice(1));
    }
  }, [giftQueue, isPlayingGift]);

  // Handle gift animation end
  const handleGiftEnded = () => {
      setCurrentGift(null);
      setIsPlayingGift(false);
  };

  const handleSendGift = async (gift: typeof GIFTS[0]) => {
    if (isBroadcast && isBattleMode) return;
    // Allow everyone to spend if they have coins locally (which we just set to max)
    if (coinBalance < gift.coins) {
        alert("Not enough coins! (Top up feature coming soon)");
        return;
    }
    if (useRealApi && user?.id) {
      // DEV BACKDOOR: Skip API call for everyone to avoid DB balance check failure
      const devSkipBalanceCheck = true;
      if (devSkipBalanceCheck || user.username === 'bericaandrei') {
          // Simulate success and update LEVEL/XP locally + DB
          let currentLevel = userLevel;
          let currentXP = userXP;
          const xpGained = gift.coins;
          currentXP += xpGained;
          
          while (true) {
              const xpNeeded = currentLevel * 1000;
              if (currentXP >= xpNeeded) {
                  if (currentLevel < 150) {
                      currentLevel++;
                      currentXP -= xpNeeded;
                  } else {
                      currentXP = xpNeeded;
                      break;
                  }
              } else {
                  break;
              }
          }
          
          setUserLevel(currentLevel);
          setUserXP(currentXP);
          updateUser({ level: currentLevel });
          
          supabase.from('profiles')
              .update({ level: currentLevel, xp: currentXP })
              .eq('user_id', user.id)
              .then(() => {});
              
      } else {
          const { data, error } = await supabase.rpc('send_stream_gift', {
            p_stream_key: effectiveStreamId,
            p_gift_id: gift.id,
          });

          if (error) {
            const msg = typeof error.message === 'string' ? error.message : '';
            if (msg.includes('insufficient_funds')) {
              alert('Not enough coins');
              return;
            }
            if (msg.includes('stream_not_found')) {
              alert('Stream not ready yet. Try again.');
              return;
            }
            alert('Gift failed');
            return;
          }

          const row = Array.isArray(data) ? data[0] : data;
          if (row?.new_balance != null) {
            setCoinBalance(Number(row.new_balance));
          }
          if (row?.new_level != null) {
            setUserLevel(Number(row.new_level));
            updateUser({ level: Number(row.new_level) });
          }
          if (row?.new_xp != null) {
            setUserXP(Number(row.new_xp));
          }
      }
    } else {
      setCoinBalance(prev => prev - gift.coins);
    }

    maybeEnqueueUniverse(gift.name, viewerName);
    addBattleGifterCoins(viewerName, gift.coins);

    if (isBattleMode && battleTime > 0 && !battleWinner) {
      awardBattlePoints(giftTarget, gift.coins);
    }

    const newLevel = useRealApi ? userLevel : (() => {
      const xpGained = gift.coins;
      let newXP = userXP + xpGained;
      let lvl = userLevel;
      let xpNeeded = lvl * 1000;
      while (newXP >= xpNeeded) {
        lvl++;
        newXP -= xpNeeded;
        xpNeeded = lvl * 1000;
      }
      setUserXP(newXP);
      setUserLevel(lvl);
      return lvl;
    })();
    
    setShowGiftPanel(false);

    if (isBroadcast && !isBattleMode) {
      maybeTriggerFaceARGift(gift);
    }
    
    // Always queue the video animation for the sender/viewer to see immediate feedback
    if (gift.video) {
      setGiftQueue(prev => [...prev, gift.video]);
    }
    
    // Add to chat
    const giftMsg = {
        id: Date.now().toString(),
        username: viewerName,
        text: `Sent a ${gift.name}`,
        isGift: true,
        level: newLevel,
        avatar: viewerAvatar,
    };
    setMessages(prev => [...prev, giftMsg]);

    // Handle Combo Logic
    setLastSentGift(gift);
    setComboCount(1);
    setShowComboButton(true);
    resetComboTimer();
  };

  const handleShare = async () => {
    const shareText = `${myCreatorName} is live on ELIX STAR`;
    const shareUrl = `https://app.com/live/${effectiveStreamId}`;
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    try {
      if (nav && 'share' in nav) {
        await (nav as Navigator & { share: (d: { title?: string; text?: string; url?: string }) => Promise<void> }).share({
          title: 'ELIX STAR LIVE',
          text: shareText,
          url: shareUrl,
        });
        return;
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(shareUrl);
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString() + '_share', username: 'System', text: 'Link copied', isSystem: true },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + '_share_err', username: 'System', text: 'Share failed', isSystem: true },
      ]);
    }
  };

  const toggleMic = () => {
    const next = !isMicMuted;
    setIsMicMuted(next);
    const stream = cameraStreamRef.current;
    if (stream) stream.getAudioTracks().forEach((t) => (t.enabled = !next));
  };

  const flipCamera = async () => {
    if (!isBroadcast) return;
    setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const resetComboTimer = () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
          setShowComboButton(false);
          setComboCount(0);
          setLastSentGift(null);
      }, 5000); // 5 seconds to combo
  };

  const handleComboClick = async () => {
      if (!lastSentGift) return;
      
      // Send same gift again
      if (user?.username !== 'bericaandrei' && coinBalance < lastSentGift.coins) {
        alert("Not enough coins!");
        return;
      }

      if (useRealApi && user?.id) {
        if (user.username === 'bericaandrei') {
            // Simulate success and update LEVEL/XP locally + DB
            let currentLevel = userLevel;
            let currentXP = userXP;
            const xpGained = lastSentGift.coins;
            currentXP += xpGained;
            
            while (true) {
                const xpNeeded = currentLevel * 1000;
                if (currentXP >= xpNeeded) {
                    if (currentLevel < 150) {
                        currentLevel++;
                        currentXP -= xpNeeded;
                    } else {
                        currentXP = xpNeeded;
                        break;
                    }
                } else {
                    break;
                }
            }
            
            setUserLevel(currentLevel);
            setUserXP(currentXP);
            updateUser({ level: currentLevel });
            
            supabase.from('profiles')
                .update({ level: currentLevel, xp: currentXP })
                .eq('user_id', user.id)
                .then(() => {});
        } else {
            const { data, error } = await supabase.rpc('send_stream_gift', {
              p_stream_key: effectiveStreamId,
              p_gift_id: lastSentGift.id,
            });

            if (error) {
              const msg = typeof error.message === 'string' ? error.message : '';
              if (msg.includes('insufficient_funds')) {
                alert('Not enough coins');
                return;
              }
              if (msg.includes('stream_not_found')) {
                alert('Stream not ready yet. Try again.');
                return;
              }
              alert('Gift failed');
              return;
            }

            const row = Array.isArray(data) ? data[0] : data;
            if (row?.new_balance != null) setCoinBalance(Number(row.new_balance));
            if (row?.new_level != null) {
              setUserLevel(Number(row.new_level));
              updateUser({ level: Number(row.new_level) });
            }
            if (row?.new_xp != null) setUserXP(Number(row.new_xp));
        }
      } else {
        setCoinBalance(prev => prev - lastSentGift.coins);
      }

      maybeEnqueueUniverse(lastSentGift.name, viewerName);
      addBattleGifterCoins(viewerName, lastSentGift.coins);

      if (isBattleMode && battleTime > 0 && !battleWinner) {
        awardBattlePoints(giftTarget, lastSentGift.coins);
      }

      const newLevel = useRealApi
        ? userLevel
        : (() => {
            const xpGained = lastSentGift.coins;
            let newXP = userXP + xpGained;
            let lvl = userLevel;
            let xpNeeded = lvl * 1000;
            while (newXP >= xpNeeded) {
              lvl++;
              newXP -= xpNeeded;
              xpNeeded = lvl * 1000;
            }
            setUserXP(newXP);
            setUserLevel(lvl);
            return lvl;
          })();

      setGiftQueue(prev => [...prev, lastSentGift.video]);
      setComboCount(prev => prev + 1);
      
      // Update chat (optional, or just show combo)
      const giftMsg = {
        id: Date.now().toString(),
        username: viewerName,
        text: `Sent ${lastSentGift.name} x${comboCount + 1}`,
        isGift: true,
        level: newLevel
      };
      setMessages(prev => [...prev, giftMsg]);

      resetComboTimer();
  };

  const simulateIncomingGift = () => {
      const randomGift = GIFTS[Math.floor(Math.random() * GIFTS.length)];
      const randomUser = ['fan_123', 'super_star', 'mystic_wolf'][Math.floor(Math.random() * 3)];
      
      const isFaceARGift = randomGift.id.startsWith('face_ar_');
      if (!isFaceARGift && randomGift.video) {
        setGiftQueue(prev => [...prev, randomGift.video]);
      }

      if (isBroadcast && !isBattleMode) {
        maybeTriggerFaceARGift(randomGift);
      }

      maybeEnqueueUniverse(randomGift.name, randomUser);
      addBattleGifterCoins(randomUser, randomGift.coins);

      if (isBattleMode && battleTime > 0 && !battleWinner) {
        const target = Math.random() > 0.5 ? 'me' : 'opponent';
        awardBattlePoints(target, randomGift.coins);
      }
      
      const giftMsg = {
          id: Date.now().toString(),
          username: randomUser,
          text: `Sent a ${randomGift.name} ${randomGift.icon}`,
          isGift: true,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(randomUser)}&background=random`,
      };
      setMessages(prev => [...prev, giftMsg]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim()) return;
      
      const newMsg = {
          id: Date.now().toString(),
          username: viewerName,
          text: inputValue,
          level: userLevel,
          avatar: viewerAvatar,
      };
      setMessages(prev => [...prev, newMsg]);
      setInputValue('');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const stopBroadcast = () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      clearCachedCameraStream();
      navigate('/');
  };

  const handleScreenTap = () => {
    const now = Date.now();
    const last = lastScreenTapRef.current;
    lastScreenTapRef.current = now;
    if (now - last > 320) return;
    if (isBattleMode) {
      if (isBroadcast) return;
      addLiveLikes(1);
      awardBattlePoints(giftTarget, 3);
      return;
    }
    handleComboClick();
  };

  const openMiniProfile = (username: string, coins?: number) => {
    const avatar =
      username === myCreatorName
        ? myAvatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
    const level = username === myCreatorName ? userLevel : null;
    setMiniProfile({ username, avatar, level, coins });
  };

  const closeMiniProfile = () => setMiniProfile(null);

  const _startBattleMatch = () => {
    if (!isBattleMode) return;
    setMyScore(0);
    setOpponentScore(0);
    setBattleWinner(null);
    setBattleGifterCoins({});
    battleScoreTapWindowRef.current = { windowStart: 0, count: 0 };
    setBattleTime(0);
    setBattleCountdown(3);
  };

  const _closeBattleMatch = () => {
    if (!isBattleMode) return;
    setBattleCountdown(null);
    setBattleTime(0);
    const winner = myScore === opponentScore ? 'draw' : myScore > opponentScore ? 'me' : 'opponent';
    setBattleWinner(winner);
  };

  const totalScore = myScore + opponentScore;
  const leftPctRaw = totalScore > 0 ? (myScore / totalScore) * 100 : 50;
  const leftPct = Math.max(3, Math.min(97, leftPctRaw));
  const universeText = currentUniverse
    ? `${currentUniverse.sender} sent ${universeGiftLabel} to ${currentUniverse.receiver}`
    : '';
  const universeDurationSeconds = Math.max(6, Math.min(16, universeText.length * 0.12));
  const isLiveNormal = isBroadcast && !isBattleMode;
  const activeLikes = liveLikes;

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="relative w-full h-[100dvh] md:w-[450px] md:h-[90vh] md:max-h-[850px] md:rounded-3xl bg-black overflow-hidden  border-none">
      {/* Solid Black Background for the whole container */}
      <div className="absolute inset-0 bg-black pointer-events-none z-0" />

      {/* Live Video Placeholder or Camera Feed */}
      <div ref={stageRef} className="relative w-full h-full">
        <div className="absolute inset-0 pointer-events-none z-[240]">
          {floatingHearts.map((h) => (
            <div
              key={h.id}
              className="absolute elix-heart-float"
              style={
                {
                  left: `${h.x}px`,
                  top: `${h.y}px`,
                  transform: 'translate(-50%, -50%)',
                  '--elix-heart-dx': `${h.dx}px`,
                  '--elix-heart-rot': `${h.rot}deg`,
                } as React.CSSProperties
              }
            >
              <Heart className="drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]" style={{ width: h.size, height: h.size, color: h.color, fill: h.color }} />
            </div>
          ))}
        </div>
        
        {/* Base Video Layer - Always Show for Broadcaster */}
        {(!isBattleMode || isBroadcast) && (
          <div
            className="relative w-full h-full"
            onPointerDown={(e) => {
              if (isBattleMode && isBroadcast) return; // Battle overlay handles taps for broadcaster
              if (e.target instanceof Element) {
                const interactive = e.target.closest('button, a, input, textarea, select, [role="button"]');
                if (interactive) return;
              }
              spawnHeartFromClient(e.clientX, e.clientY);
              addLiveLikes(1);
              const now = Date.now();
              const last = lastScreenTapRef.current;
              lastScreenTapRef.current = now;
              if (now - last <= 320) {
                handleComboClick();
              }
            }}
          >
            {isBroadcast ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform scale-x-[-1]"
                autoPlay
                playsInline
                muted
              />
            ) : (
              <video
                src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                onError={(e) => {
                  console.warn("Video failed to load, falling back to black");
                  e.currentTarget.style.display = 'block';
                  e.currentTarget.parentElement?.classList.add('bg-black');
                }}
              />
            )}

            {isBroadcast && activeFaceARGift && (
              <>
                <canvas
                  ref={faceARCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
                />
                <FaceARGift
                  giftType={activeFaceARGift.type}
                  color={activeFaceARGift.color || '#E6B36A'}
                />
              </>
            )}

            {isBroadcast && cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-white font-bold">
                {cameraError}
              </div>
            )}
          </div>
        )}

        {/* Battle Split Screen Overlay - Shows ONLY when in battle mode */}
        {isBattleMode && (
          <div
            className={`absolute inset-0 z-[80] flex flex-col bg-black ${isBroadcast ? 'pointer-events-none' : 'pb-24'}`}
            style={{ paddingTop: isBroadcast ? '90px' : '90px', paddingBottom: isBroadcast ? '305px' : undefined }}
            onClick={!isBroadcast ? handleScreenTap : undefined}
          >
            {battleCountdown != null && (
              <div className="absolute inset-0 z-[260] pointer-events-none flex items-center justify-center">
                {/* LUXURY BATTLE COUNTDOWN */}
                <div className="w-32 h-32 flex items-center justify-center animate-luxury-pulse relative">
                  <div className="text-white text-6xl font-black tabular-nums relative z-10 drop-shadow-[0_0_20px_rgba(230,179,106,1)]">{battleCountdown}</div>
                </div>
              </div>
            )}

            <div className="relative w-full flex-1 flex">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGiftTarget('me');
                }}
                onPointerDown={(e) => {
                  console.log('Left tap:', e.clientX, e.clientY);
                  spawnHeartFromClient(e.clientX, e.clientY, '#FF2D55');
                  addLiveLikes(1);
                }}
                className={`w-1/2 h-full overflow-hidden relative border-r border-transparent bg-black pointer-events-auto ${giftTarget === 'me' ? 'ring-2 ring-[#FF4DA6]' : ''}`}
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                  autoPlay
                  playsInline
                  muted
                />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setGiftTarget('opponent');
                }}
                onPointerDown={(e) => {
                  console.log('Right tap (chat):', e.clientX, e.clientY, 'Likes:', activeLikes);
                  spawnHeartFromClient(e.clientX, e.clientY, '#FF2D55');
                  addLiveLikes(1);
                }}
                className={`w-1/2 h-full bg-gray-900 relative overflow-hidden pointer-events-auto ${giftTarget === 'opponent' ? 'ring-2 ring-[#4A7DFF]' : ''}`}
              >
                <video
                  ref={opponentVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBattle();
                }}
                className="absolute top-[-14px] left-0 right-0 z-20 w-full h-6 rounded-none overflow-hidden shadow-2xl pointer-events-auto"
              >
                {/* LUXURY BATTLE PROGRESS BAR */}
                <div className="absolute inset-0 flex">
                  <div
                    className="h-full transition-all duration-500 ease-out relative overflow-hidden"
                    style={{
                      width: `${leftPct}%`,
                      backgroundImage: 'linear-gradient(90deg, #DC143C, #FF1744, #C41E3A)',
                    }}
                  >
                  </div>
                  <div
                    className="h-full flex-1 transition-all duration-500 ease-out relative overflow-hidden"
                    style={{ backgroundImage: 'linear-gradient(90deg, #1E90FF, #4169E1, #0047AB)' }}
                  >
                  </div>
                </div>
                <div className="relative z-10 h-full flex items-center justify-between px-3">
                  <div className="px-2 py-0.5 text-white font-black text-[11px] tabular-nums">
                    {myScore.toLocaleString()}
                  </div>
                  <div className="px-2.5 py-0.5 text-[#E6B36A] text-[10px] font-black tabular-nums">
                    {formatTime(battleTime)}
                  </div>
                  <div className="px-2 py-0.5 text-white font-black text-[11px] tabular-nums">
                    {opponentScore.toLocaleString()}
                  </div>
                </div>
              </button>

              {battleWinner && (
                <div className="absolute left-3 right-3 top-3 z-50 pointer-events-none">
                  {/* LUXURY BATTLE WINNER DISPLAY */}
                  {battleWinner === 'draw' ? (
                    <div className="mt-9 flex justify-center">
                      <div className="px-4 py-2 animate-luxury-fade-in">
                        <div className="text-[#E6B36A] text-sm font-black tracking-widest drop-shadow-[0_0_10px_rgba(230,179,106,0.8)]">
                          DRAW
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-9 flex items-center justify-between animate-luxury-fade-in">
                      <div
                        className={`px-4 py-2 text-sm font-black tracking-widest transition-all ${
                          battleWinner === 'me'
                            ? 'bg-gradient-to-r from-[#FFD700] to-[#E6B36A] text-black animate-premium-glow scale-110'
                            : 'text-white/50'
                        }`}
                      >
                        {battleWinner === 'me' ? '🏆 WIN' : ''}
                      </div>
                      <div
                        className={`px-4 py-2 text-sm font-black tracking-widest transition-all ${
                          battleWinner === 'opponent'
                            ? 'bg-gradient-to-r from-[#FFD700] to-[#E6B36A] text-black animate-premium-glow scale-110'
                            : 'text-white/50'
                        }`}
                      >
                        {battleWinner === 'opponent' ? '🏆 WIN' : ''}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Section for Spectators Only */}
            {!isBroadcast && (
              <div className="flex-1 bg-black overflow-hidden relative pt-6">
                <ChatOverlay
                  messages={messages}
                  variant="panel"
                  className="static w-full h-full bg-black border-0 p-4"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Bar - Always show for broadcaster (both normal and battle mode) */}
      {isBroadcast && (
        <div className="absolute top-0 left-0 right-0 z-[110] pointer-events-none">
          <div className="px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}>
            <div className="flex items-start justify-between gap-2">
              <div className="pointer-events-auto flex flex-col gap-2">
                {/* LUXURY BROADCASTER INFO */}
                <div className="px-3 py-2 animate-luxury-fade-in">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <img
                        src={myAvatar}
                        alt={myCreatorName}
                        className="w-9 h-9 rounded-full object-cover border-2 border-[#E6B36A] shadow-lg"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-black animate-premium-glow" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-bold truncate max-w-[120px]">
                        {myCreatorName}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#E6B36A] to-[#FFD700] rounded text-black text-[9px] font-black uppercase tracking-wide">
                          LIVE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopBroadcast}
                  className="w-10 h-10 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                  <img src="/Icons/power-button.png" alt="Exit" className="w-8 h-8 object-contain" />
                </button>
              </div>
            </div>
            {currentUniverse && (
              <div className="mt-1">
                <div className="pointer-events-auto h-7 rounded-lg bg-black border border-transparent flex items-center overflow-hidden">
                  <div className="elix-marquee w-full">
                    <div
                      key={currentUniverse.id}
                      className="elix-marquee__inner text-[#E6B36A] text-[13px] font-semibold"
                      style={{
                        animationDuration: `${universeDurationSeconds}s`,
                        animationIterationCount: 1,
                        animationTimingFunction: 'linear',
                        animationFillMode: 'forwards',
                      }}
                      onAnimationEnd={() => setCurrentUniverse(null)}
                    >
                      {universeText}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {!isBroadcast && (
        <>
        <div className="absolute top-0 left-0 right-0 z-[110] pointer-events-none">
        <div className="px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="pointer-events-auto flex flex-col gap-1">
              {/* LUXURY CREATOR PROFILE BUTTON */}
              <button type="button" onClick={() => openMiniProfile(myCreatorName)} className="pr-3 pl-2 py-2 hover:scale-105 transition-all animate-luxury-fade-in">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img
                      src={myAvatar}
                      alt={myCreatorName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#E6B36A] shadow-lg"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-2 border-black animate-premium-glow" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-black text-[14px] truncate max-w-[160px]">{myCreatorName}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-gradient-to-r from-[#E6B36A] to-[#FFD700] rounded text-black text-[9px] font-black uppercase tracking-wide">
                        LIVE
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* LIVE LIKES COUNTER - Under Profile */}
              <div className="pl-2 flex items-center gap-1">
                <Heart className="w-4 h-4 text-[#E6B36A]" strokeWidth={2.5} fill="#E6B36A" />
                <span className="text-white text-sm font-black tabular-nums">
                  {activeLikes.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pointer-events-auto flex flex-col items-center gap-2">
              {/* LUXURY POPULAR BADGE */}
              <div className="h-9 px-3 flex items-center gap-2 animate-luxury-fade-in">
                <Flame className="w-4 h-4 text-[#E6B36A] animate-float" strokeWidth={2.5} />
                <span className="text-white text-xs font-black">Popular</span>
              </div>
              {!isBattleMode && isBroadcast && (
                <button
                  type="button"
                  onClick={() => setIsFindCreatorsOpen(true)}
                  className="pointer-events-auto  h-8 px-3 text-[#E6B36A] text-xs font-black flex items-center gap-2 hover:scale-105 transition-all"
                >
                  <UsersRound className="w-4 h-4" strokeWidth={2.5} />
                  Find creators
                </button>
              )}
            </div>

            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isBroadcast ? stopBroadcast : () => navigate('/')}
                  className="w-10 h-10 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                  <LogOut size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            </div>
          </div>

          {currentUniverse && (
            <div className="mt-0">
              <div className="pointer-events-auto h-7 rounded-lg bg-red-950 border border-[#E6B36A] flex items-center justify-center overflow-hidden shadow-[0_0_16px_rgba(230,179,106,0.12)]">
                <div className="w-full px-2 text-center">
                  <div
                    key={currentUniverse.id}
                    className="text-white text-[14px] font-extrabold truncate"
                  >
                    {universeText}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        </>
      )}

      {isFindCreatorsOpen && (
        <div className="fixed inset-0 z-[500] bg-black  flex items-end justify-center">
          <div className="w-full max-w-[500px] bg-black overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6B36A]">
              <p className="text-[#E6B36A] font-extrabold">Invite to Battle</p>
              <button
                type="button"
                onClick={() => {
                  setIsFindCreatorsOpen(false);
                  setCreatorQuery('');
                }}
                className="p-2 text-[#E6B36A]"
              >
                <img src="/Icons/power-button.png" alt="Close" className="w-5 h-5 object-contain" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 px-3 h-10 rounded-xl bg-black border border-[#E6B36A]/25">
                <Search className="w-4 h-4 text-[#E6B36A]/80" strokeWidth={2} />
                <input
                  value={creatorQuery}
                  onChange={(e) => setCreatorQuery(e.target.value)}
                  placeholder="Search creators"
                  className="flex-1 bg-transparent outline-none text-white text-sm"
                />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto">
              {filteredCreators.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-3 flex items-center justify-between border-b border-transparent"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 flex items-center justify-center text-[#E6B36A] font-extrabold">
                      {c.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{c.name}</p>
                      <p className="text-white/60 text-xs">{c.followers} followers</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startBattleWithCreator(c.name)}
                    className="px-3 py-1.5 bg-[#E6B36A] text-black text-xs font-extrabold"
                  >
                    Invite
                  </button>
                </div>
              ))}

              {filteredCreators.length === 0 && (
                <div className="px-4 py-10 text-center text-white/70 text-sm">No creators found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gift Overlay Animation */}
      <GiftOverlay 
        videoSrc={currentGift} 
        onEnded={handleGiftEnded} 
      />

      <AnimatePresence>
        {miniProfile && (
          <motion.div
            className="absolute inset-0 z-[400] pointer-events-auto flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMiniProfile}
          >
            <div className="absolute inset-0 bg-black" />
            <motion.div
              className="relative w-full md:w-[450px] rounded-t-3xl bg-black border border-transparent px-4 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))]"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={miniProfile.avatar} alt={miniProfile.username} className="w-12 h-12 rounded-full object-cover border border-[#E6B36A]/40" />
                  <div className="min-w-0">
                    <div className="text-white font-black text-[16px] truncate">{miniProfile.username}</div>
                    <div className="text-white/70 text-[12px] font-bold">
                      {typeof miniProfile.level === 'number' ? (
                        <span className="inline-flex items-center gap-2">
                          <LevelBadge level={miniProfile.level} size={10} layout="fixed" />
                          <span>Level {miniProfile.level}</span>
                        </span>
                      ) : (
                        'Level —'
                      )}
                      {miniProfile.coins != null ? ` • 🪙 ${formatCoinsShort(miniProfile.coins)}` : ''}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={closeMiniProfile} className="w-9 h-9 flex items-center justify-center text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <button type="button" onClick={() => alert('Followed')} className="h-10 rounded-xl bg-[#E6B36A] text-black text-xs font-black">
                  Follow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGiftPanel(true);
                    closeMiniProfile();
                  }}
                  className="h-10 text-white text-xs font-black"
                >
                  Gift
                </button>
                <button type="button" onClick={handleShare} className="h-10 text-white text-xs font-black">
                  Share
                </button>
                <button type="button" onClick={() => alert('Blocked')} className="h-10 bg-red-950 text-white text-xs font-black">
                  Block
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      

      {/* Chat Area */}
      {isChatVisible && (
        <ChatOverlay
          messages={messages}
          variant="overlay"
          className={
            isLiveNormal
              ? "pb-[calc(84px+env(safe-area-inset-bottom))] z-[100]"
              : isBroadcast && isBattleMode
                ? "pb-[calc(16px+env(safe-area-inset-bottom))] z-[100]"
                : "z-[100]"
          }
          onLike={() => addLiveLikes(1)}
        />
      )}

      {/* Combo Button Overlay */}
      <AnimatePresence>
        {showComboButton && lastSentGift && (
            <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute right-4 bottom-24 z-[56] flex flex-col items-center"
            >
                <button 
                    onClick={handleComboClick}
                    className="w-14 h-14 bg-gradient-to-r from-secondary to-orange-500 flex flex-col items-center justify-center animate-pulse active:scale-90 transition-transform"
                >
                    <span className="text-lg font-black italic text-white drop-shadow-md">x{comboCount}</span>
                    <span className="text-[8px] font-bold text-white uppercase tracking-widest">Combo</span>
                </button>
                <div className="mt-1 px-2 py-0.5 text-[10px] text-secondary font-bold">
                    Send {lastSentGift.name}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls - Higher z-index to be above video */}
      {!isBroadcast && (
      <div className={`absolute bottom-4 left-4 right-4 z-[110] flex items-center gap-2 ${isPlayingGift ? 'justify-end' : ''}`}>
        {!isPlayingGift && (
            <form onSubmit={handleSendMessage} className="flex-1 bg-black px-4 py-2 flex items-center gap-2">
                <input 
                    type="text" 
                    placeholder="Say something..." 
                    className="text-white text-sm outline-none flex-1 placeholder:text-gray-400"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onPointerDown={() => addLiveLikes(1)}
                />
                <button type="submit" className="text-white">
                    <Send size={18} />
                </button>
            </form>
        )}
        
        {/* Debug: Simulate Incoming Gift */}
        {!isBattleMode && (
        <button 
            onClick={simulateIncomingGift}
            className="w-8 h-8 flex items-center justify-center text-xs text-white"
            title="Simulate Incoming Gift"
        >
            🧪
        </button>
        )}

        {/* Gift Button - Visible for everyone for testing */}
        <button
            onClick={() => setShowGiftPanel(true)}
            className="w-6 h-6 flex items-center justify-center hover:scale-110 active:scale-125 transition"
        >
            <img src="/Icons/gift-button.png" alt="Gift" className="w-6 h-6 object-contain" />
        </button>
      </div>
      )}

      {/* Bottom Controls - Always show for broadcaster */}
      {isBroadcast && (
        <div className="absolute bottom-0 left-0 right-0 z-[110]">
          <div className="px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {/* LUXURY BROADCASTER CONTROLS */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isBattleMode && (
                    <button
                      type="button"
                      onClick={toggleBattle}
                      className="w-7 h-7 flex items-center justify-center hover:scale-110 active:scale-125 transition-all relative"
                    >
                      <img src="/Icons/battle-button.png" alt="Battle" className="w-6 h-6 object-contain relative z-10" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFindCreatorsOpen(true)}
                    className="w-7 h-7 flex items-center justify-center hover:scale-110 active:scale-125 transition-all"
                  >
                    <img src="/Icons/friend-button.png" alt="Friends" className="w-6 h-6 object-contain" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGiftTarget('me');
                      setShowGiftPanel(true);
                    }}
                    className="w-7 h-7 flex items-center justify-center hover:scale-110 active:scale-125 transition-all relative"
                  >
                    <img src="/Icons/gift-button.png" alt="Gifts" className="w-6 h-6 object-contain relative z-10" />
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-7 h-7 flex items-center justify-center hover:scale-110 active:scale-125 transition-all"
                  >
                    <img src="/Icons/battle-share.png" alt="Share" className="w-6 h-6 object-contain" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMoreMenuOpen(true)}
                    className="w-7 h-7 flex items-center justify-center hover:scale-110 active:scale-125 transition-all"
                  >
                    <img src="/Icons/more-button.png" alt="More" className="w-6 h-6 object-contain" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-[700] bg-black"
          onClick={() => setIsMoreMenuOpen(false)}
          role="button"
          tabIndex={-1}
        >
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div
              className="mx-auto w-full max-w-[500px] bg-black overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="button"
              tabIndex={-1}
            >
              <button
                type="button"
                disabled={!isBroadcast}
                onClick={() => {
                  flipCamera();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-[#E6B36A] disabled:text-[#E6B36A]/40"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5" strokeWidth={2} />
                  <span className="font-semibold">Flip camera</span>
                </div>
              </button>
              <div className="h-px bg-[#E6B36A]" />
              <button
                type="button"
                disabled={!isBroadcast}
                onClick={() => {
                  toggleMic();
                  setIsMoreMenuOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-[#E6B36A] disabled:text-[#E6B36A]/40"
              >
                <div className="flex items-center gap-3">
                  {isMicMuted ? <MicOff className="w-5 h-5" strokeWidth={2} /> : <Mic className="w-5 h-5" strokeWidth={2} />}
                  <span className="font-semibold">{isMicMuted ? 'Unmute microphone' : 'Mute microphone'}</span>
                </div>
              </button>
              <div className="h-px bg-[#E6B36A]" />
              <button
                type="button"
                onClick={() => {
                  setIsLiveSettingsOpen(true);
                  setIsMoreMenuOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-[#E6B36A]"
              >
                <div className="flex items-center gap-3">
                  <Settings2 className="w-5 h-5" strokeWidth={2} />
                  <span className="font-semibold">Live settings</span>
                </div>
              </button>
              <div className="h-px bg-[#E6B36A]" />
              <button
                type="button"
                onClick={() => {
                  setIsChatVisible((v) => !v);
                  setIsMoreMenuOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-[#E6B36A]"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5" strokeWidth={2} />
                  <span className="font-semibold">{isChatVisible ? 'Hide comments' : 'Show comments'}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {isLiveSettingsOpen && (
        <div
          className="fixed inset-0 z-[710] bg-black"
          onClick={() => setIsLiveSettingsOpen(false)}
          role="button"
          tabIndex={-1}
        >
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div
              className="mx-auto w-full max-w-[500px] bg-black overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="button"
              tabIndex={-1}
            >
              <div className="px-4 py-3 flex items-center justify-between text-[#E6B36A]">
                <div className="flex flex-col">
                  <span className="font-extrabold">Live settings</span>
                  <span className="text-[10px] text-white/40 font-mono">v1.5 (Clean UI)</span>
                </div>
                <button type="button" onClick={() => setIsLiveSettingsOpen(false)} className="p-2">
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
              <div className="h-px bg-[#E6B36A]" />
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    toggleMic();
                    setIsLiveSettingsOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-[#E6B36A] hover:brightness-125"
                >
                  <div className="flex items-center gap-3">
                    {isMicMuted ? <MicOff className="w-5 h-5" strokeWidth={2} /> : <Mic className="w-5 h-5" strokeWidth={2} />}
                    <span className="font-semibold">{isMicMuted ? 'Unmute microphone' : 'Mute microphone'}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsChatVisible((v) => !v);
                    setIsLiveSettingsOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-[#E6B36A] hover:brightness-125"
                >
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5" strokeWidth={2} />
                    <span className="font-semibold">{isChatVisible ? 'Hide comments' : 'Show comments'}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleShare();
                    setIsLiveSettingsOpen(false);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-[#E6B36A] hover:brightness-125"
                >
                  <div className="flex items-center gap-3">
                    <img src="/Icons/battle-share.png" alt="Share" className="w-7 h-7 object-contain" />
                    <span className="font-semibold">Share</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gift Panel Slide-up */}
      <AnimatePresence>
        {showGiftPanel && (
            <>
                <div 
                    className="absolute inset-0 bg-black/40 z-[150]"
                    onClick={() => setShowGiftPanel(false)}
                />
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="absolute bottom-0 left-0 right-0 z-[160]"
                >
                    <GiftPanel 
                        onSelectGift={handleSendGift} 
                        userCoins={coinBalance} 
                        onRechargeSuccess={(newBalance) => setCoinBalance(newBalance)}
                    />
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
