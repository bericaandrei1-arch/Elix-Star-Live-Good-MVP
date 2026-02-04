import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setCachedCameraStream } from '../lib/cameraStream';
import { RefreshCw, Zap, Clock, Music, Check, Play, Square, RotateCcw } from 'lucide-react';
import { useVideoStore } from '../store/useVideoStore';
import { SOUND_TRACKS, type SoundTrack } from '../lib/soundLibrary';
import { trackEvent } from '../lib/analytics';
import { useSettingsStore } from '../store/useSettingsStore';

export default function Upload() {
  const navigate = useNavigate();
  const { muteAllSounds } = useSettingsStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('original');
  const [postWithoutAudio, setPostWithoutAudio] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postProgress, setPostProgress] = useState(0);
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null); // Track currently playing preview
  const previewAudioRef = useRef<HTMLAudioElement | null>(null); // For list preview
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null); // For video background
  const [customTracks, setCustomTracks] = useState<SoundTrack[]>([]);

  const { addVideo } = useVideoStore();

  type UploadMusic = {
    id: string;
    title: string;
    artist: string;
    duration: string;
    previewUrl?: string;
  };

  const formatClip = (start: number, end: number) => {
    const total = Math.max(0, Math.floor(end - start));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const musicTracks: SoundTrack[] = [...customTracks, ...SOUND_TRACKS];

  const getSelectedLabel = () => {
    if (postWithoutAudio || selectedAudioId === 'none') return 'No audio';
    if (selectedAudioId === 'original') return 'Original Sound';
    if (selectedAudioId.startsWith('track_')) {
      const raw = selectedAudioId.slice('track_'.length);
      const id = Number(raw);
      const t = musicTracks.find((x) => x.id === id);
      return t ? t.title : 'Add Sound';
    }
    return 'Add Sound';
  };

   const handleSelectMusic = (track: SoundTrack) => {
       setSelectedAudioId(`track_${track.id}`);
       setPostWithoutAudio(false);
       setShowMusicModal(false);
       trackEvent('upload_select_audio', { type: 'library', trackId: track.id, title: track.title });
       if (previewAudioRef.current) {
           previewAudioRef.current.pause();
           setPlayingTrackId(null);
       }
   };
 
   const togglePreview = (e: React.MouseEvent, track: SoundTrack) => {
       e.stopPropagation(); // Don't select, just play

       if (muteAllSounds) {
           trackEvent('upload_preview_audio_blocked_global_mute', { trackId: track.id });
           return;
       }
       
       if (playingTrackId === track.id) {
           // Stop
           if (previewAudioRef.current) {
               previewAudioRef.current.pause();
               setPlayingTrackId(null);
           }
       } else {
           // Play new
           if (previewAudioRef.current) {
               previewAudioRef.current.pause();
           }
           // Create new audio or reuse
           if (track.url) {
               previewAudioRef.current = new Audio(track.url);
               const start = Math.max(0, track.clipStartSeconds);
               const end = Math.max(start, track.clipEndSeconds);
               previewAudioRef.current.volume = 1.0;
               previewAudioRef.current.currentTime = start;
               previewAudioRef.current.play()
                   .then(() => console.log("Audio playing:", track.title))
                   .catch(e => {
                       console.error("Audio play failed", e);
                       alert("Could not play audio. Check console for details.");
                   });
               setPlayingTrackId(track.id);
               
               // Auto stop at end
               previewAudioRef.current.onended = () => setPlayingTrackId(null);
               previewAudioRef.current.ontimeupdate = () => {
                 const a = previewAudioRef.current;
                 if (!a) return;
                 if (end > start && a.currentTime >= end) {
                   a.pause();
                   a.currentTime = start;
                   setPlayingTrackId(null);
                 }
               };
           } else {
               // No URL (No Music)
               setPlayingTrackId(null);
           }
       }
   };

  useEffect(() => {
    if (!recordedVideoUrl) {
      setCaption('');
      setHashtagsText('');
      setPostWithoutAudio(false);
      setSelectedAudioId('original');
      setIsPosting(false);
      setPostProgress(0);
    }
  }, [recordedVideoUrl]);

   // Start Camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError("Camera access denied or not available.");
      }
    }
    
    // Only start camera if not previewing
    if (!recordedVideoUrl) {
        startCamera();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [recordedVideoUrl]);

  const startRecording = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const mediaRecorder = new MediaRecorder(stream);
      
      setChunks([]); // Clear previous chunks
      setIsPaused(false);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setChunks((prev) => [...prev, e.data]);
        }
      };

      mediaRecorder.onstop = () => {
        // Blob creation happens in useEffect when chunks update and recording is stopped fully
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsRecording(false);
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsRecording(true);
      setIsPaused(false);
    }
  };

  const stopRecordingFinal = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      // This will trigger the useEffect to create the blob URL
    }
  };

  // Watch for recording stop to create URL
  useEffect(() => {
    // Only create URL if we fully stopped (not just paused) and have chunks
    if (!isRecording && !isPaused && chunks.length > 0) {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
    }
  }, [isRecording, isPaused, chunks]);

  const toggleRecording = () => {
    if (!isRecording && !isPaused) {
      startRecording();
    } else if (isRecording) {
      pauseRecording();
    } else if (isPaused) {
      resumeRecording();
    }
  };

  // Audio Preview Logic for Recorded Video
  useEffect(() => {
      const shouldPlayTrack =
        !!recordedVideoUrl &&
        !muteAllSounds &&
        !postWithoutAudio &&
        selectedAudioId.startsWith('track_');

      if (!shouldPlayTrack) {
        if (backgroundAudioRef.current) backgroundAudioRef.current.pause();
        return;
      }

      const raw = selectedAudioId.slice('track_'.length);
      const id = Number(raw);
      const track = musicTracks.find((t) => t.id === id);
      if (!track?.url) {
        if (backgroundAudioRef.current) backgroundAudioRef.current.pause();
        return;
      }

      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
      }

      backgroundAudioRef.current = new Audio(track.url);
      const start = Math.max(0, track.clipStartSeconds);
      const end = Math.max(start, track.clipEndSeconds);
      backgroundAudioRef.current.loop = false;
      backgroundAudioRef.current.volume = 0.5;
      backgroundAudioRef.current.currentTime = start;
      backgroundAudioRef.current.ontimeupdate = () => {
        const a = backgroundAudioRef.current;
        if (!a) return;
        if (end > start && a.currentTime >= end) {
          a.currentTime = start;
          a.play().catch(() => {});
        }
      };
      backgroundAudioRef.current.play().catch(() => {});

      return () => {
        if (backgroundAudioRef.current) backgroundAudioRef.current.pause();
      };
  }, [muteAllSounds, postWithoutAudio, recordedVideoUrl, selectedAudioId, musicTracks]);

  const handlePost = async () => {
      if (!recordedVideoUrl || isPosting) return;

      const normalizedCaption = caption.trim();
      const captionHashtags = Array.from(normalizedCaption.matchAll(/#([\p{L}0-9_]+)/gu)).map((m) => m[1]);
      const manualHashtags = hashtagsText
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t.slice(1) : t));

      const hashtags = Array.from(new Set([...captionHashtags, ...manualHashtags].map((h) => h.toLowerCase()))).slice(0, 20);

      let resolvedMusic: UploadMusic = {
        id: 'original_sound',
        title: 'Original Sound',
        artist: 'Current User',
        duration: '0:15',
      };

      if (postWithoutAudio || selectedAudioId === 'none') {
        resolvedMusic = { id: 'no_audio', title: 'No audio', artist: '', duration: '0:15' };
      } else if (selectedAudioId.startsWith('track_')) {
        const raw = selectedAudioId.slice('track_'.length);
        const id = Number(raw);
        const picked = musicTracks.find((t) => t.id === id);
        if (picked?.url) {
          resolvedMusic = {
            id: `track_${picked.id}`,
            title: picked.title,
            artist: picked.artist,
            duration: formatClip(picked.clipStartSeconds, picked.clipEndSeconds),
            previewUrl: picked.url,
          };
        }
      }

      setIsPosting(true);
      setPostProgress(0);
      trackEvent('upload_post_start', { hasCaption: !!normalizedCaption, hashtagsCount: hashtags.length, audio: resolvedMusic.id });

      await new Promise<void>((resolve) => {
        const started = Date.now();
        const tick = () => {
          const elapsed = Date.now() - started;
          const next = Math.min(100, Math.floor((elapsed / 1100) * 100));
          setPostProgress(next);
          if (next >= 100) resolve();
          else window.setTimeout(tick, 60);
        };
        tick();
      });

      const newVideo = {
          id: Date.now().toString(),
          url: recordedVideoUrl,
          thumbnail: `https://picsum.photos/400/600?random=${Date.now()}`,
          duration: '0:15',
          user: {
            id: 'current_user',
            username: 'me',
            name: 'Current User',
            avatar: 'https://ui-avatars.com/api/?name=Me',
            isVerified: false,
            followers: 1234,
            following: 567
          },
          description: normalizedCaption || 'New video',
          hashtags,
          music: resolvedMusic,
          stats: {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            saves: 0
          },
          createdAt: new Date().toISOString(),
          isLiked: false,
          isSaved: false,
          isFollowing: false,
          comments: [],
          quality: 'auto' as const,
          privacy: 'public' as const
      };

      addVideo(newVideo);
      trackEvent('upload_post_success', { videoId: newVideo.id });
      setRecordedVideoUrl(null);
      setChunks([]);
      setIsPosting(false);
      setPostProgress(0);
      alert("Video Posted to For You Feed! ✅");
  };

  const handleDiscard = () => {
      setRecordedVideoUrl(null);
      setChunks([]);
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setRecordedVideoUrl(url);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-black overflow-hidden flex items-end justify-center">
      
      {/* PREVIEW MODE */}
       {recordedVideoUrl ? (
           <div className="relative z-10 w-full max-w-[500px] mx-auto h-[100dvh] bg-black flex flex-col items-center justify-center">
               <video 
                   src={recordedVideoUrl} 
                   className="w-full h-full object-cover z-0" 
                   controls={false}
                   autoPlay 
                   loop 
               />
               
               {/* Overlay Image in Preview too */}
               <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
                    <img 
                        src="/Icons/Camera.png" 
                        className="absolute inset-0 w-full h-full object-fill object-bottom opacity-50" // Semi-transparent or full?
                        alt="Camera Interface"
                    />
               </div>

               {/* Preview Top Controls */}
               <div className="absolute top-[2%] left-0 right-0 z-20 flex justify-center pointer-events-auto">
                    <button 
                        className="w-40 h-8 rounded-full flex items-center justify-center gap-1 bg-black border border-transparent"
                        onClick={() => setShowMusicModal(true)}
                    >
                        <Music size={14} className="text-white" />
                        <span className="text-white text-xs font-bold truncate max-w-[120px]">
                            {getSelectedLabel()}
                        </span>
                    </button>
               </div>

               <div className="absolute bottom-[22%] left-0 right-0 z-20 px-4 pointer-events-auto">
                 <div className="bg-black border border-transparent rounded-2xl p-3 space-y-3">
                   <textarea
                     value={caption}
                     onChange={(e) => setCaption(e.target.value)}
                     placeholder="Write a caption…"
                     className="w-full bg-white border border-transparent rounded-xl px-3 py-2 text-sm outline-none resize-none h-20"
                     aria-label="Caption"
                   />
                   <input
                     value={hashtagsText}
                     onChange={(e) => setHashtagsText(e.target.value)}
                     placeholder="Hashtags (ex: elix, live, creator)"
                     className="w-full bg-white border border-transparent rounded-xl px-3 py-2 text-sm outline-none"
                     aria-label="Hashtags"
                   />
                   <div className="flex items-center justify-between">
                     <div className="text-xs text-white/70 font-semibold">Post without audio</div>
                     <button
                       type="button"
                       className={`w-12 h-7 rounded-full border transition-colors ${
                         postWithoutAudio ? 'bg-[#E6B36A] border-[#E6B36A]' : 'bg-white border-transparent'
                       }`}
                       onClick={() => {
                         const next = !postWithoutAudio;
                         setPostWithoutAudio(next);
                         if (next) setSelectedAudioId('none');
                         trackEvent('upload_toggle_no_audio', { value: next });
                       }}
                       aria-label="Toggle post without audio"
                     >
                       <div
                         className={`w-6 h-6 rounded-full bg-black transition-transform ${
                           postWithoutAudio ? 'translate-x-5' : 'translate-x-1'
                         }`}
                       />
                     </button>
                   </div>
                   {isPosting ? (
                     <div className="w-full">
                       <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                         <span>Posting…</span>
                         <span>{postProgress}%</span>
                       </div>
                       <div className="h-2 bg-white rounded-full overflow-hidden">
                         <div className="h-full bg-[#E6B36A]" style={{ width: `${postProgress}%` }} />
                       </div>
                     </div>
                   ) : null}
                 </div>
               </div>

               {/* Preview Controls - Custom Buttons Over Overlay */}
               <div className="absolute bottom-[10%] left-0 right-0 flex justify-center gap-20 z-20 pointer-events-auto">
                   <button 
                       onClick={handleDiscard}
                       className="flex flex-col items-center gap-2 group"
                       title="Retake"
                   >
                       <div className="w-16 h-16 bg-gray-800/80 rounded-full flex items-center justify-center text-white border-2 border-white group-hover:bg-gray-700">
                           <RotateCcw size={32} />
                       </div>
                       <span className="text-white font-bold text-sm shadow-black drop-shadow-md">Retake</span>
                   </button>

                   <button 
                       onClick={handlePost}
                       className="flex flex-col items-center gap-2 group disabled:opacity-60"
                       title="Post"
                       disabled={isPosting}
                   >
                       <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
                           <Check size={32} />
                       </div>
                       <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{isPosting ? 'Posting' : 'Post'}</span>
                   </button>
               </div>
           </div>
       ) : (
        /* CAMERA MODE */
        <>
          {/* Container Principal - Limitat la mărimea unui telefon (500px) */}
          <div className="relative z-10 w-full max-w-[500px] mx-auto h-[100dvh] mb-0 pointer-events-none bg-black shadow-2xl overflow-hidden">
              
              {/* Camera Preview Layer */}
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className={`absolute inset-0 w-full h-full object-cover z-0 ${cameraError ? 'hidden' : ''}`}
              />

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center z-0 bg-gray-900 text-white p-4 text-center">
                  <p>{cameraError}</p>
                </div>
              )}

              {/* Imaginea de fundal a interfeței - PESTE VIDEO cu SCREEN blend */}
              <img 
                src="/Icons/Camera.png" 
                className="absolute inset-0 w-full h-full object-fill object-bottom z-10 mix-blend-screen" 
                alt="Camera Interface"
              />

              {/* Interactive Hitboxes Layer */}
              <div className="absolute inset-0 z-20 w-full h-full pointer-events-auto">
                  {/* 1. Close Button */}
                  <button 
                    onClick={() => navigate('/')} 
                    className="absolute top-[2%] left-[5%] w-10 h-10 flex items-center justify-center bg-red-500/50 rounded-full"
                    title="Close"
                  >
                    X
                  </button>

                  {/* 2. Sound/Music */}
                  <button 
                    className="absolute top-[2%] left-1/2 -translate-x-1/2 w-40 h-8 rounded-full flex items-center justify-center gap-1 bg-black border border-transparent z-[150]"
                    onClick={() => setShowMusicModal(true)}
                  >
                    <Music size={14} className="text-white" />
                    <span className="text-white text-xs font-bold truncate max-w-[120px]">
                        {getSelectedLabel()}
                    </span>
                  </button>

                  {/* 3. Flip Camera */}
                  <button 
                    className="absolute top-[18%] right-[5%] w-8 h-8 flex items-center justify-center opacity-0 hover:opacity-100 hover:brightness-125 rounded-full"
                    onClick={() => alert('Flip Camera')}
                  >
                    <RefreshCw size={20} className="text-white" />
                  </button>

                  {/* 4. Speed */}
                  <button 
                    className="absolute top-[26%] right-[5%] w-8 h-8 flex items-center justify-center opacity-0 hover:opacity-100 hover:brightness-125 rounded-full"
                    onClick={() => alert('Speed')}
                  >
                    <span className="text-white font-bold text-xs">1x</span>
                  </button>

                  {/* 5. Beauty */}
                  <button 
                    className="absolute top-[34%] right-[5%] w-8 h-8 flex items-center justify-center opacity-0 hover:opacity-100 hover:brightness-125 rounded-full"
                    onClick={() => alert('Beauty')}
                  >
                    <span className="text-white text-xs">✨</span>
                  </button>

                  {/* 6. Timer */}
                  <button 
                    className="absolute top-[42%] right-[5%] w-8 h-8 flex items-center justify-center opacity-0 hover:opacity-100 hover:brightness-125 rounded-full"
                    onClick={() => alert('Timer')}
                  >
                    <Clock size={20} className="text-white" />
                  </button>

                  {/* 7. Flash */}
                  <button 
                    className="absolute top-[50%] right-[5%] w-8 h-8 flex items-center justify-center opacity-0 hover:opacity-100 hover:brightness-125 rounded-full"
                    onClick={() => alert('Flash')}
                  >
                    <Zap size={20} className="text-white" />
                  </button>

                  {/* --- Bottom Controls --- */}

                  {/* 8. Effects */}
                  <button 
                    className="absolute bottom-[15%] left-[15%] w-10 h-10 bg-cyan-500/50 rounded-lg"
                    onClick={() => alert('Effects')}
                  >
                    Ef
                  </button>

                  {/* 9. Record Button (Play / Stop Logic) */}
                  <div className="absolute bottom-[10.5%] left-1/2 -translate-x-1/2 flex items-center gap-4">
                      {/* Done Button (Visible only if we have chunks and are paused or recording) */}
                      {(chunks.length > 0 || isPaused) && (
                          <button 
                            className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white border-2 border-white animate-in fade-in zoom-in duration-300 absolute -right-20"
                            onClick={stopRecordingFinal}
                          >
                              <Check size={24} />
                          </button>
                      )}

                      <button 
                        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-600 border-4 border-white' : 'bg-white border-4 border-white hover:bg-red-600/50'}`}
                        onClick={toggleRecording}
                      >
                        {isRecording ? (
                            <Square className="text-white fill-white w-8 h-8" />
                        ) : (
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                                {/* Inner Circle */}
                            </div>
                        )}
                      </button>
                  </div>

                  {/* 11. Go Live Hitbox (Right Side - Invisible) */}
                  <button 
                     className="absolute bottom-[2.5%] right-[30%] w-12 h-8 flex items-center justify-center pointer-events-auto z-[100] opacity-0 hover:brightness-125 cursor-pointer"
                     onClick={async () => {
                         try {
                           const stream = await navigator.mediaDevices.getUserMedia({
                             video: {
                               width: { ideal: 1080 },
                               height: { ideal: 1920 },
                               facingMode: 'user',
                             },
                             audio: true,
                           });
                           setCachedCameraStream(stream);
                           navigate('/live/broadcast');
                         } catch {
                           alert('Camera access denied');
                         }
                     }}
                     title="Go Live"
                  >
                      <span className="sr-only">Go Live</span>
                  </button>

                  {/* 10. Upload (Left Side - Invisible) */}
                  <button 
                    className="absolute bottom-[7%] left-[4%] w-16 h-16 flex items-center justify-center opacity-0 hover:brightness-125 rounded-lg cursor-pointer z-[100]"
                    onClick={handleFileUpload}
                    title="Upload from Gallery"
                  >
                    <span className="sr-only">Upload</span>
                  </button>
              </div>

              {/* Music Selection Modal */}
              {showMusicModal && (
                  <div className="absolute inset-0 z-[200] bg-black flex flex-col pt-10 px-4 animate-in slide-in-from-bottom duration-300">
                      <div className="flex items-center justify-between mb-6">
                          <h2 className="text-white text-xl font-bold">Select Sound</h2>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const url = window.prompt('Paste audio URL (mp3/ogg):');
                                if (!url) return;
                                const title = window.prompt('Sound name:') ?? 'Custom sound';
                                const next: SoundTrack = {
                                  id: Date.now(),
                                  title: title.trim() || 'Custom sound',
                                  artist: 'You',
                                  duration: 'custom',
                                  url: url.trim(),
                                  license: 'Custom (you must own rights)',
                                  source: 'Custom URL',
                                  clipStartSeconds: 0,
                                  clipEndSeconds: 180,
                                };
                                setCustomTracks((prev) => [next, ...prev]);
                              }}
                              className="px-3 py-1.5 rounded-full border border-transparent text-white/80 text-xs font-semibold hover:brightness-125"
                            >
                              Add URL
                            </button>
                            <button 
                              onClick={() => setShowMusicModal(false)}
                              className="text-white p-2"
                            >
                                X
                            </button>
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pb-10">
                          <div className="grid grid-cols-2 gap-2 pb-2">
                            <button
                              type="button"
                              className={`px-3 py-3 rounded-xl border text-left ${
                                selectedAudioId === 'original' && !postWithoutAudio
                                  ? 'bg-[#E6B36A] border-[#E6B36A] text-black'
                                  : 'bg-white border-transparent text-white'
                              }`}
                              onClick={() => {
                                setSelectedAudioId('original');
                                setPostWithoutAudio(false);
                                trackEvent('upload_select_audio', { type: 'original' });
                                setShowMusicModal(false);
                              }}
                            >
                              <div className="text-sm font-bold">Original Sound</div>
                              <div className={`text-[11px] ${selectedAudioId === 'original' && !postWithoutAudio ? 'text-black/70' : 'text-white/60'}`}>
                                Use the captured audio
                              </div>
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-3 rounded-xl border text-left ${
                                postWithoutAudio || selectedAudioId === 'none'
                                  ? 'bg-[#E6B36A] border-[#E6B36A] text-black'
                                  : 'bg-white border-transparent text-white'
                              }`}
                              onClick={() => {
                                setSelectedAudioId('none');
                                setPostWithoutAudio(true);
                                trackEvent('upload_select_audio', { type: 'none' });
                                setShowMusicModal(false);
                              }}
                            >
                              <div className="text-sm font-bold">No audio</div>
                              <div className={`text-[11px] ${postWithoutAudio || selectedAudioId === 'none' ? 'text-black/70' : 'text-white/60'}`}>
                                Publish muted audio
                              </div>
                            </button>
                          </div>

                          {musicTracks.map((track) => (
                              <div 
                                key={track.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-white hover:brightness-125 cursor-pointer border border-transparent"
                                onClick={() => handleSelectMusic(track)}
                              >
                                  <div className="flex items-center gap-3">
                                      <button 
                                        className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded flex items-center justify-center hover:scale-105 transition-transform"
                                        onClick={(e) => togglePreview(e, track)}
                                      >
                                          {playingTrackId === track.id ? (
                                              <Square size={16} className="text-white fill-white" />
                                          ) : (
                                              <Play size={16} className="text-white fill-white" />
                                          )}
                                      </button>
                                      <div>
                                          <h3 className="text-white font-bold text-sm">{track.title}</h3>
                                          <p className="text-white/60 text-xs">{track.artist} • {formatClip(track.clipStartSeconds, track.clipEndSeconds)}</p>
                                          <p className="text-white/40 text-[11px]">{track.license}</p>
                                      </div>
                                  </div>
                                  {selectedAudioId === `track_${track.id}` && !postWithoutAudio && (
                                    <Check className="text-green-400" size={20} />
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
        </>
      )}
    </div>
  );
}
