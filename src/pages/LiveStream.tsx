import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Send,
  UsersRound,
  Search,
  Heart,
  Flame,
  User,
  Play,
  Link2,
  Users,
  MessageCircle,
  Gift,
  Share2,
  MoreVertical,
  RefreshCw,
  Mic,
  MicOff,
  Settings2,
  LogOut,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { GiftPanel, GIFTS } from '../components/EnhancedGiftPanel';
import { GiftOverlay } from '../components/GiftOverlay';
import { ChatOverlay } from '../components/ChatOverlay';
import { LevelBadge } from '../components/LevelBadge';
import { FaceARGift } from '../components/FaceARGift';
import { useLivePromoStore } from '../store/useLivePromoStore';
import { useAuthStore } from '../store/useAuthStore';
import { clearCachedCameraStream, getCachedCameraStream } from '../lib/cameraStream';
import { supabase } from '../lib/supabase';
import { useRealApi } from '../lib/apiFallback';

type LiveMessage = {
  id: string;
  username: string;
  text: string;
  level?: number;
  isGift?: boolean;
  avatar?: string;
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
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const setPromo = useLivePromoStore((s) => s.setPromo);
  const updateUser = useAuthStore((s) => s.updateUser);
  const effectiveStreamId = streamId || 'broadcast';
  const PROMOTE_LIKES_THRESHOLD_LIVE = 10_000;
  const PROMOTE_LIKES_THRESHOLD_BATTLE = 5_000;
  
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

      // DEV BACKDOOR: Force max coins for 'bericaandrei'
      if (user?.username === 'bericaandrei') {
          setCoinBalance(999999);
      } else if (!cancelled && data?.coin_balance != null) {
          return;
      }

      if (error) {
        return;
      }

      await supabase.from('profiles').insert({ user_id: user.id, coin_balance: 0, level: 1, xp: 0 });
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
      try {
        await supabase.from('live_streams').upsert(
          {
            stream_key: key,
            user_id: user.id,
            title: creatorName,
            is_live: true,
          },
          { onConflict: 'stream_key' }
        );
      } catch {
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
  const [battleTapScoreRemaining, setBattleTapScoreRemaining] = useState(5);
  const [liveLikes, setLiveLikes] = useState(0);
  const [battleLikes, setBattleLikes] = useState(0);
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

  const toggleBattle = () => {
    if (isBattleMode) {
      setIsBattleMode(false);
      setBattleTime(300);
      setBattleWinner(null);
      return;
    }
    setIsBattleMode(true);
    setBattleTime(180);
    setMyScore(0);
    setOpponentScore(0);
    setBattleWinner(null);
    setGiftTarget('me');
    battleTapScoreRemainingRef.current = 5;
    setBattleTapScoreRemaining(5);
  };

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

    if (isBattleMode) {
      setBattleLikes((prev) => {
        const next = prev + delta;
        if (prev < PROMOTE_LIKES_THRESHOLD_BATTLE && next >= PROMOTE_LIKES_THRESHOLD_BATTLE) {
          setPromo({
            type: 'battle',
            streamId: effectiveStreamId,
            likes: next,
            createdAt: Date.now(),
          });
        }
        return next;
      });
      return;
    }

    setLiveLikes((prev) => {
      const next = prev + delta;
      if (prev < PROMOTE_LIKES_THRESHOLD_LIVE && next >= PROMOTE_LIKES_THRESHOLD_LIVE) {
        setPromo({
          type: 'live',
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldStartBattle = params.get('battle') === '1';
    if (shouldStartBattle && !isBattleMode) {
      toggleBattle();
    }
  }, [location.search]);

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

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1080 },
            height: { ideal: 1920 },
            facingMode: cameraFacing,
          },
          audio: true,
        });

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
  const faceARCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const faceARTimeoutRef = useRef<number | null>(null);
  const [faceARVideoEl, setFaceARVideoEl] = useState<HTMLVideoElement | null>(null);
  const [faceARCanvasEl, setFaceARCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [battleGiftIconFailed, setBattleGiftIconFailed] = useState(false);
  const [activeFaceARGift, setActiveFaceARGift] = useState<
    | { type: 'crown' | 'glasses' | 'mask' | 'ears' | 'hearts' | 'stars'; color?: string }
    | null
  >(null);

  useEffect(() => {
    if (!activeFaceARGift) {
      setFaceARVideoEl(null);
      setFaceARCanvasEl(null);
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      setFaceARVideoEl(videoRef.current);
      setFaceARCanvasEl(faceARCanvasRef.current);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [activeFaceARGift]);

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
    if (faceARTimeoutRef.current) {
      window.clearTimeout(faceARTimeoutRef.current);
    }
    faceARTimeoutRef.current = window.setTimeout(() => {
      setActiveFaceARGift(null);
      faceARTimeoutRef.current = null;
    }, 10_000);
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
    if (user?.username !== 'bericaandrei' && coinBalance < gift.coins) {
        alert("Not enough coins! (Top up feature coming soon)");
        return;
    }
    if (useRealApi && user?.id) {
      // DEV BACKDOOR: Skip API call for bericaandrei but UPDATE LEVEL
      if (user.username === 'bericaandrei') {
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
    const shareUrl = window.location.href;
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

  // Debug Function to Simulate Incoming Gift
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

  const totalScore = myScore + opponentScore;
  const leftPctRaw = totalScore > 0 ? (myScore / totalScore) * 100 : 50;
  const leftPct = Math.max(3, Math.min(97, leftPctRaw));
  const universeText = currentUniverse
    ? `${currentUniverse.sender} sent ${universeGiftLabel} to ${currentUniverse.receiver}`
    : '';
  const universeDurationSeconds = Math.max(6, Math.min(16, universeText.length * 0.12));
  const isLiveNormal = isBroadcast && !isBattleMode;
  const activeLikes = isBattleMode ? battleLikes : liveLikes;

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="relative w-full h-[100dvh] md:w-[450px] md:h-[90vh] md:max-h-[850px] md:rounded-3xl bg-black overflow-hidden shadow-2xl border border-white/10">
      {/* Solid Black Background for the whole container */}
      <div className="absolute inset-0 bg-black pointer-events-none z-0" />

      {/* Live Video Placeholder or Camera Feed */}
      <div className="relative w-full h-full">
        {isBattleMode ? (
          <div
            className="relative w-full h-full flex flex-col bg-black"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 112px)' }}
          >
            <div className="relative w-full h-[56%] flex">
              {isBattleMode && (
                <button
                  type="button"
                  onClick={toggleBattle}
                  className="absolute top-[-14px] left-0 right-0 z-20 w-full h-5 rounded-none overflow-hidden bg-black/40 backdrop-blur-md"
                >
                  <div className="absolute inset-0 flex">
                    <div
                      className="h-full transition-all duration-500 ease-out"
                      style={{
                        width: `${leftPct}%`,
                        backgroundImage: 'linear-gradient(90deg, #8B0000, #B22222)', // Dark Red to FireBrick
                      }}
                    />
                    <div
                      className="h-full flex-1 transition-all duration-500 ease-out"
                      style={{ backgroundImage: 'linear-gradient(90deg, #4169E1, #00008B)' }} // RoyalBlue to DarkBlue
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="relative z-10 h-full flex items-center justify-between px-2.5">
                    <div className="text-white font-extrabold text-[10px] tabular-nums drop-shadow">
                      {myScore.toLocaleString()}
                    </div>
                    <div className="px-1.5 py-0 rounded bg-black/65 border border-white/20 text-white text-[9px] font-bold tabular-nums">
                      {formatTime(battleTime)}
                    </div>
                    <div className="text-white font-extrabold text-[10px] tabular-nums drop-shadow">
                      {opponentScore.toLocaleString()}
                    </div>
                  </div>
                </button>
              )}
              <button
                type="button"
                onClick={() => setGiftTarget('me')}
                onPointerDown={() => {
                  setGiftTarget('me');
                  addLiveLikes(1);
                  if (battleTapScoreRemainingRef.current > 0) {
                    awardBattlePoints('me', 1);
                    battleTapScoreRemainingRef.current -= 1;
                    setBattleTapScoreRemaining(battleTapScoreRemainingRef.current);
                  }
                }}
                className={`w-1/2 h-full overflow-hidden relative border-r border-black/50 bg-black ${giftTarget === 'me' ? 'outline outline-2 outline-secondary/70' : ''}`}
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
                onClick={() => setGiftTarget('opponent')}
                onPointerDown={() => {
                  setGiftTarget('opponent');
                  addLiveLikes(1);
                  if (battleTapScoreRemainingRef.current > 0) {
                    awardBattlePoints('opponent', 1);
                    battleTapScoreRemainingRef.current -= 1;
                    setBattleTapScoreRemaining(battleTapScoreRemainingRef.current);
                  }
                }}
                className={`w-1/2 h-full bg-gray-900 relative overflow-hidden ${giftTarget === 'opponent' ? 'outline outline-2 outline-secondary/70' : ''}`}
              >
                <video
                  ref={opponentVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              </button>

              {battleWinner && (
                <div className="absolute left-3 right-3 top-3 z-50 pointer-events-none">
                  {battleWinner === 'draw' ? (
                    <div className="mt-9 flex justify-center">
                      <div className="px-3 py-1.5 rounded-full bg-black/65 border border-white/15 text-[#E6B36A] text-xs font-black tracking-widest">
                        DRAW
                      </div>
                    </div>
                  ) : (
                    <div className="mt-9 flex items-center justify-between">
                      <div
                        className={`px-3 py-1.5 rounded-full border text-xs font-black tracking-widest ${
                          battleWinner === 'me'
                            ? 'bg-[#E6B36A] text-black border-[#E6B36A]'
                            : 'bg-black/65 text-white/70 border-white/15'
                        }`}
                      >
                        {battleWinner === 'me' ? 'WIN' : ''}
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-full border text-xs font-black tracking-widest ${
                          battleWinner === 'opponent'
                            ? 'bg-[#E6B36A] text-black border-[#E6B36A]'
                            : 'bg-black/65 text-white/70 border-white/15'
                        }`}
                      >
                        {battleWinner === 'opponent' ? 'LOSE' : ''}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Section (Bottom) */}
            <div className="flex-1 bg-black overflow-hidden relative pt-6">
              <ChatOverlay
                messages={messages}
                variant="panel"
                className="static w-full h-full bg-black border-0 p-4"
              />
              <div className="absolute right-4 bottom-4 z-[80] pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setShowGiftPanel(true)}
                  className="w-11 h-11 bg-black/70 rounded-full flex items-center justify-center text-white shadow-lg border border-white/20 hover:bg-black/80 transition"
                >
                  {battleGiftIconFailed ? (
                    <Gift className="w-6 h-6 text-white" strokeWidth={2} />
                  ) : (
                    <img
                      src="/Icons/Gift%20icon.png?v=3"
                      alt="Gift"
                      className="w-6 h-6 object-contain"
                      onError={() => setBattleGiftIconFailed(true)}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="relative w-full h-full"
            onPointerDown={(e) => {
              if (e.target instanceof Element) {
                const interactive = e.target.closest('button, a, input, textarea, select, [role="button"]');
                if (interactive) return;
              }
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
                  videoElement={faceARVideoEl}
                  canvasElement={faceARCanvasEl}
                  giftType={activeFaceARGift.type}
                  color={activeFaceARGift.color}
                  isActive={true}
                />
              </>
            )}

            {isBroadcast && cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white font-bold">
                {cameraError}
              </div>
            )}
          </div>
        )}
      </div>

      {isLiveNormal && (
        <div className="absolute top-0 left-0 right-0 z-[90] pointer-events-none">
          <div className="px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
            <div className="flex items-start justify-between">
              <div className="pointer-events-auto flex items-center gap-3 text-[#E6B36A] drop-shadow">
                <div className="flex items-center gap-2">
                  <img
                    src={myAvatar}
                    alt={myCreatorName}
                    className="w-9 h-9 rounded-full object-cover border border-[#E6B36A]/50"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <LevelBadge level={userLevel} size={10} layout="fixed" className="-mt-1" />
                      <p className="font-extrabold text-[16px] truncate max-w-[170px]">{myCreatorName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-[#E6B36A]">
                      <Heart className="w-4 h-4" strokeWidth={2} />
                      <span>{liveLikes.toLocaleString()}</span>
                      <span className="text-[#E6B36A]/60">•</span>
                      <Flame className="w-4 h-4" strokeWidth={2} />
                      <span className="text-[12px] font-semibold whitespace-nowrap">Daily Ranking</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-auto flex items-center gap-4 text-[#E6B36A] drop-shadow">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Play className="w-5 h-5" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-[14px]">
                  <User className="w-5 h-5" strokeWidth={2} />
                  <span>10.2k</span>
                </div>
                <button type="button" onClick={stopBroadcast} className="p-2 text-[#E6B36A]">
                  <LogOut className="w-6 h-6" strokeWidth={2} />
                </button>
              </div>
            </div>
            {currentUniverse && (
              <div className="mt-3">
                <div className="pointer-events-auto h-7 rounded-lg bg-black/55 border border-white/15 flex items-center overflow-hidden">
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

      {!isLiveNormal && (
      <div className="absolute top-0 left-0 right-0 z-[80] pointer-events-none">
        <div className="px-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4px)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="pointer-events-auto inline-flex items-center gap-2 pr-3 pl-2 py-2 rounded-2xl bg-black/45 backdrop-blur-md border border-white/10">
              <img
                src={myAvatar}
                alt={myCreatorName}
                className="w-10 h-10 rounded-full object-cover border border-[#E6B36A]/50"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <LevelBadge level={userLevel} size={10} layout="fixed" className="-mt-1" />
                  <p className="text-white font-extrabold text-[14px] truncate max-w-[160px]">{myCreatorName}</p>
                </div>
                <p className="text-[#E6B36A]/80 text-[10px] font-extrabold tracking-widest">LIVE</p>
              </div>
            </div>

            <div className="pointer-events-auto flex flex-col items-center gap-2">
              <div className="h-8 px-3 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#E6B36A]" strokeWidth={2} />
                <span className="text-white text-xs font-extrabold">Popular</span>
              </div>
              <div className="h-8 px-3 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E6B36A]" strokeWidth={2} />
                <span className="text-white text-xs font-extrabold tabular-nums">{activeLikes.toLocaleString()}</span>
              </div>
              {!isBattleMode && isBroadcast && (
                <button
                  type="button"
                  onClick={() => setIsFindCreatorsOpen(true)}
                  className="pointer-events-auto h-8 px-3 rounded-full bg-black/70 border border-[#E6B36A]/30 text-[#E6B36A] text-xs font-extrabold flex items-center gap-2"
                >
                  <UsersRound className="w-4 h-4" strokeWidth={2} />
                  Find creators
                </button>
              )}
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <div className="h-8 px-3 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center gap-2">
                <User className="w-4 h-4 text-white" strokeWidth={2} />
                <span className="text-white font-extrabold text-xs">10.2k</span>
              </div>
              <button
                type="button"
                onClick={isBroadcast ? stopBroadcast : () => navigate('/')}
                className="w-9 h-9 rounded-full bg-black/70 border border-white/10 text-white flex items-center justify-center"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {currentUniverse && (
            <div className="mt-0">
              <div className="pointer-events-auto h-7 rounded-lg bg-red-950 border border-[#E6B36A]/30 flex items-center justify-center overflow-hidden shadow-[0_0_16px_rgba(230,179,106,0.12)]">
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
      </div>
      )}

      {isFindCreatorsOpen && (
        <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-[500px] bg-black border-t border-[#E6B36A]/30 rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6B36A]/20">
              <p className="text-[#E6B36A] font-extrabold">Invite to Battle</p>
              <button
                type="button"
                onClick={() => {
                  setIsFindCreatorsOpen(false);
                  setCreatorQuery('');
                }}
                className="p-2 text-[#E6B36A]"
              >
                <X className="w-5 h-5" strokeWidth={2} />
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
                  className="px-4 py-3 flex items-center justify-between border-b border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#E6B36A]/20 border border-[#E6B36A]/25 flex items-center justify-center text-[#E6B36A] font-extrabold">
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
                    className="px-3 py-1.5 rounded-full bg-[#E6B36A] text-black text-xs font-extrabold"
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

      {/* My User Level Indicator - REMOVED as requested (only on user now) */}
      {/* <div className="absolute top-16 right-4 flex flex-col items-end z-10 animate-slide-left"> ... </div> */}

      {/* Gift Overlay Animation */}
      <GiftOverlay 
        videoSrc={currentGift} 
        onEnded={handleGiftEnded} 
      />

      

      {/* Chat Area */}
      {!isBattleMode && isChatVisible && (
        <ChatOverlay
          messages={messages}
          variant="overlay"
          className={isLiveNormal ? "pb-[calc(84px+env(safe-area-inset-bottom))]" : undefined}
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
                    className="w-14 h-14 bg-gradient-to-r from-secondary to-orange-500 rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white animate-pulse active:scale-90 transition-transform"
                >
                    <span className="text-lg font-black italic text-white drop-shadow-md">x{comboCount}</span>
                    <span className="text-[8px] font-bold text-white uppercase tracking-widest">Combo</span>
                </button>
                <div className="mt-1 bg-black/60 px-2 py-0.5 rounded-full text-[10px] text-secondary font-bold border border-secondary/30">
                    Send {lastSentGift.name}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls - Higher z-index to be above video */}
      {!isLiveNormal && (
      <div className={`absolute bottom-4 left-4 right-4 z-[55] flex items-center gap-2 ${isPlayingGift ? 'justify-end' : ''}`}>
        {!isPlayingGift && (
            <form onSubmit={handleSendMessage} className="flex-1 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2">
                <input 
                    type="text" 
                    placeholder="Say something..." 
                    className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-gray-400"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
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
            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-xs text-white border border-white/20"
            title="Simulate Incoming Gift"
        >
            🧪
        </button>
        )}

        {/* Gift Button - Visible for everyone for testing */}
        <button 
            onClick={() => setShowGiftPanel(true)}
            className="w-10 h-10 bg-black/70 rounded-full flex items-center justify-center text-white shadow-lg border border-white/20 hover:bg-black/80 transition"
        >
            <img src="/Icons/Gift%20icon.png?v=3" alt="Gift" className="w-5 h-5 object-contain" />
        </button>
      </div>
      )}

      {isLiveNormal && (
        <div className="absolute bottom-0 left-0 right-0 z-[95]">
          <div className="px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="h-14 flex items-center justify-between text-[#E6B36A] drop-shadow">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsFindCreatorsOpen(true)} className="p-2">
                  <Link2 className="w-7 h-7" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGiftTarget('me');
                    setShowGiftPanel(true);
                  }}
                  className="p-2"
                >
                  <Gift className="w-7 h-7" strokeWidth={2} />
                </button>
                <button type="button" className="p-2">
                  <Users className="w-7 h-7" strokeWidth={2} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsChatVisible((v) => !v)} className="p-2">
                  <MessageCircle className="w-7 h-7" strokeWidth={2} />
                </button>
                <button type="button" onClick={handleShare} className="p-2">
                  <Share2 className="w-7 h-7" strokeWidth={2} />
                </button>
                <button type="button" onClick={() => setIsMoreMenuOpen(true)} className="p-2">
                  <MoreVertical className="w-7 h-7" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMoreMenuOpen && (
        <div
          className="fixed inset-0 z-[700] bg-black/50"
          onClick={() => setIsMoreMenuOpen(false)}
          role="button"
          tabIndex={-1}
        >
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div
              className="mx-auto w-full max-w-[500px] rounded-2xl bg-black/90 border border-[#E6B36A]/25 overflow-hidden"
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
              <div className="h-px bg-[#E6B36A]/10" />
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
              <div className="h-px bg-[#E6B36A]/10" />
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
              <div className="h-px bg-[#E6B36A]/10" />
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
          className="fixed inset-0 z-[710] bg-black/55"
          onClick={() => setIsLiveSettingsOpen(false)}
          role="button"
          tabIndex={-1}
        >
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div
              className="mx-auto w-full max-w-[500px] rounded-2xl bg-black/90 border border-[#E6B36A]/25 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="button"
              tabIndex={-1}
            >
              <div className="px-4 py-3 flex items-center justify-between text-[#E6B36A]">
                <span className="font-extrabold">Live settings</span>
                <button type="button" onClick={() => setIsLiveSettingsOpen(false)} className="p-2">
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>
              <div className="h-px bg-[#E6B36A]/10" />
              <div className="px-4 py-4 text-[#E6B36A]/80 text-sm font-semibold">Settings panel (placeholder)</div>
            </div>
          </div>
        </div>
      )}

      {/* Gift Panel Slide-up */}
      <AnimatePresence>
        {showGiftPanel && (
            <>
                <div 
                    className="absolute inset-0 bg-black/50 z-30"
                    onClick={() => setShowGiftPanel(false)}
                />
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="absolute bottom-0 left-0 right-0 z-[60]"
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
