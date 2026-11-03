import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Film,
  Download,
  ShieldCheck
} from 'lucide-react';
import Hls from 'hls.js';
import { Movie, AdSlot, AdSettings } from '../types.ts';
import { api } from '../services/api.ts';
import { AdBanner } from './Ads/AdBanner.tsx';

interface VideoPlayerProps {
  movie: Movie;
  onBack: () => void;
  onSelectMovie?: (movie: Movie) => void;
  adSlots?: AdSlot[];
  adSettings?: AdSettings;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  movie,
  onBack,
  adSlots = [],
  adSettings
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Error & Fallback detection state
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isFormatUnsupported, setIsFormatUnsupported] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanUrl = movie.streamingUrl?.trim() || '';
  const isMkv = cleanUrl.toLowerCase().endsWith('.mkv') || cleanUrl.toLowerCase().includes('.mkv');
  const isHls = cleanUrl.toLowerCase().endsWith('.m3u8') || cleanUrl.toLowerCase().includes('.m3u8');
  const isFtp = cleanUrl.toLowerCase().startsWith('ftp://');

  const showAds = adSettings?.masterEnabled && adSettings?.playerAdsEnabled && !isFullscreen;

  // Record view count once on mount
  useEffect(() => {
    api.recordView(movie.id);
  }, [movie.id]);

  // Video source setup & HLS binding
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !cleanUrl) return;

    // Reset error states
    setPlaybackError(null);
    setIsFormatUnsupported(false);

    if (isMkv) {
      setIsFormatUnsupported(true);
      setPlaybackError('The MKV format is not natively decodable by standard web browsers. Please use the direct stream link below to play or download.');
    } else if (isFtp) {
      setIsFormatUnsupported(true);
      setPlaybackError('FTP streaming protocols are blocked by modern browser security sandboxes. Open directly in external player.');
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true
        });
        hls.loadSource(cleanUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.warn('HLS Fatal Error:', data);
            setPlaybackError('Stream network or codec issue: unable to fetch HLS chunks in browser.');
            setIsFormatUnsupported(true);
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = cleanUrl;
      }
    } else if (!isMkv && !isFtp) {
      video.src = cleanUrl;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [cleanUrl, isHls, isMkv, isFtp]);

  // Handle native video errors
  const handleVideoError = () => {
    const video = videoRef.current;
    if (!video) return;

    let message = 'The video stream could not be loaded directly in the browser.';
    if (video.error) {
      switch (video.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          message = 'Playback was aborted.';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          message = 'A network error occurred while attempting to stream the video. The remote server may require CORS authorization.';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          message = 'The video playback was aborted due to a corruption problem or because the video used features your browser did not support.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          message = isMkv
            ? 'The browser does not support MKV container playback directly. Use the Open Movie Link button to watch in your preferred player.'
            : 'The server format or codec is not supported by this browser, or the remote server blocks cross-origin in-browser streaming.';
          break;
      }
    }

    setPlaybackError(message);
    setIsFormatUnsupported(true);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(err => {
        console.warn('Play interrupted:', err);
        handleVideoError();
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      if (!nextMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => console.error(err));
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remainingM = m % 60;
      return `${h}:${remainingM < 10 ? '0' : ''}${remainingM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const copyStreamingLink = () => {
    navigator.clipboard.writeText(cleanUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const openOriginalUrl = () => {
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  // Find sidebar ads for player
  const playerLeftAd = adSlots.find(s => s.position === 'player_sidebar_left' && s.enabled && s.targetDevice !== 'mobile');
  const playerRightAd = adSlots.find(s => s.position === 'player_sidebar_right' && s.enabled && s.targetDevice !== 'mobile');

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto flex flex-col select-none font-sans">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 left-0 right-0 z-40 p-4 sm:px-8 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs sm:text-sm font-semibold border border-neutral-700 transition-all cursor-pointer shadow-lg hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Browse</span>
          </button>

          <div>
            <h1 className="text-white text-sm sm:text-base font-bold flex items-center gap-2">
              <span>{movie.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-red-600/80 text-white font-semibold">
                {movie.quality}
              </span>
            </h1>
            <p className="text-xs text-neutral-400 hidden sm:block">
              {movie.releaseYear} • {movie.language} • {movie.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openOriginalUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 cursor-pointer"
            title="Open original video URL in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Movie Link</span>
          </button>
        </div>
      </div>

      {/* Main Container with Optional Player Sidebars */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* 1. Banner Above Video Player (Requirement 1.D) */}
        {showAds && (
          <div className="flex justify-center">
            <AdBanner
              position="player_above"
              slots={adSlots}
              settings={adSettings!}
              className="my-1"
            />
          </div>
        )}

        {/* Video Player + Sidebars Layout */}
        <div className="flex items-start justify-center gap-4">
          {/* 2. Left Sidebar Beside Player (Requirement 1.D) */}
          {showAds && playerLeftAd && (
            <div className="hidden xl:flex flex-col items-center w-[160px] shrink-0 sticky top-20">
              <span className="text-[9px] uppercase font-bold text-neutral-500 mb-1">
                {playerLeftAd.badgeLabel}
              </span>
              <div
                onClick={() => {
                  api.recordAdClick(playerLeftAd.id, 'desktop');
                  if (playerLeftAd.targetUrl) window.open(playerLeftAd.targetUrl, '_blank', 'noopener,noreferrer');
                }}
                className="w-[160px] h-[540px] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 cursor-pointer relative group"
              >
                {playerLeftAd.imageUrl && (
                  <img src={playerLeftAd.imageUrl} alt="Left sponsor" className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/60 p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-red-400 font-bold uppercase">{playerLeftAd.network}</span>
                  <p className="text-xs font-bold text-white line-clamp-2">{playerLeftAd.titleText || playerLeftAd.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Central Cinema Player Viewport */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="relative flex-1 aspect-video min-h-[360px] sm:min-h-[480px] max-h-[72vh] rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl flex items-center justify-center"
          >
            <video
              ref={videoRef}
              onTimeUpdate={handleTimeUpdate}
              onError={handleVideoError}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={togglePlay}
              className="w-full h-full object-contain cursor-pointer"
              playsInline
            />

            {/* Fallback Banner for MKV or Restricted Stream */}
            {(isFormatUnsupported || playbackError) && (
              <div className="absolute inset-0 z-20 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8">
                <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-fadeIn">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-950/20">
                    <AlertTriangle className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      External Stream Link Ready
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                      {playbackError ||
                        'This video uses a format (.mkv) or external server policy that is restricted from playing directly inside the web browser.'}
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-left font-mono text-[11px] text-neutral-400 break-all select-all flex items-center justify-between gap-2">
                    <span className="truncate">{cleanUrl}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 shrink-0 uppercase font-sans font-bold">
                      {isMkv ? 'MKV' : isHls ? 'HLS' : 'Stream URL'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      onClick={openOriginalUrl}
                      className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-950 cursor-pointer transition-all transform hover:scale-105 active:scale-95"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Movie Link</span>
                    </button>

                    <button
                      onClick={copyStreamingLink}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm border border-neutral-700 cursor-pointer transition-colors"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Direct Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-800/80">
                    Tip: You can open the copied link directly in VLC Player, MX Player, or PotPlayer for seamless 1080p hardware acceleration.
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Controls Bar (Never covered by ads) */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-30 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 space-y-3 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="w-full flex items-center gap-3">
                <span className="text-xs font-mono text-neutral-300 w-12 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={isFormatUnsupported || duration === 0}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <span className="text-xs font-mono text-neutral-400 w-12">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    disabled={isFormatUnsupported}
                    className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold transition-all shadow-lg shadow-red-950 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                  </button>

                  <div className="flex items-center gap-2 group/vol">
                    <button
                      onClick={toggleMute}
                      className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 sm:w-24 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                  </div>

                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200">
                    {movie.quality}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openOriginalUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 cursor-pointer"
                    title="Open video link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Open Movie Link</span>
                  </button>

                  <button
                    onClick={toggleFullscreen}
                    className="p-2 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    title="Toggle Fullscreen"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Right Sidebar Beside Player (Requirement 1.D) */}
          {showAds && playerRightAd && (
            <div className="hidden xl:flex flex-col items-center w-[160px] shrink-0 sticky top-20">
              <span className="text-[9px] uppercase font-bold text-neutral-500 mb-1">
                {playerRightAd.badgeLabel}
              </span>
              <div
                onClick={() => {
                  api.recordAdClick(playerRightAd.id, 'desktop');
                  if (playerRightAd.targetUrl) window.open(playerRightAd.targetUrl, '_blank', 'noopener,noreferrer');
                }}
                className="w-[160px] h-[540px] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 cursor-pointer relative group"
              >
                {playerRightAd.imageUrl && (
                  <img src={playerRightAd.imageUrl} alt="Right sponsor" className="w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/60 p-3 flex flex-col justify-between">
                  <span className="text-[10px] text-red-400 font-bold uppercase">{playerRightAd.network}</span>
                  <p className="text-xs font-bold text-white line-clamp-2">{playerRightAd.titleText || playerRightAd.name}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Banner Below the Player (Requirement 1.D) */}
        {showAds && (
          <div className="flex justify-center pt-2">
            <AdBanner
              position="player_below"
              slots={adSlots}
              settings={adSettings!}
              className="my-2"
            />
          </div>
        )}
      </div>
    </div>
  );
};
