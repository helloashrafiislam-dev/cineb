import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Maximize2, Minimize2, Play, RefreshCw } from 'lucide-react';

interface ProviderPlayerProps {
  tmdbId: number;
  title: string;
  playerPath: string;
  providerName?: string | null;
  className?: string;
}

/**
 * Authorized provider embed player (NexStream or Vidsrc).
 * Loads a same-origin backend shell so provider secrets never ship in the React bundle.
 * Note: providers detect & block iframe sandbox — do not set sandbox on this frame.
 */
export const ProviderPlayer: React.FC<ProviderPlayerProps> = ({
  tmdbId,
  title,
  playerPath,
  providerName,
  className = ''
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** First click often triggers provider popup ads — gate until the user starts playback. */
  const [playbackArmed, setPlaybackArmed] = useState(false);

  const src = `${playerPath}${playerPath.includes('?') ? '&' : '?'}v=${reloadKey}`;
  const label = providerName || 'Provider';

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPlaybackArmed(false);
  }, [tmdbId, playerPath, reloadKey]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = Boolean(
        document.fullscreenElement ||
          // @ts-expect-error vendor-prefixed fullscreen element
          document.webkitFullscreenElement ||
          // @ts-expect-error vendor-prefixed fullscreen element
          document.msFullscreenElement
      );
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setPlaybackArmed(false);
    setReloadKey(k => k + 1);
  };

  const armPlayback = () => {
    setPlaybackArmed(true);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    try {
      const active =
        document.fullscreenElement ||
        // @ts-expect-error vendor-prefixed fullscreen element
        document.webkitFullscreenElement ||
        // @ts-expect-error vendor-prefixed fullscreen element
        document.msFullscreenElement;

      if (!active) {
        const req =
          el.requestFullscreen?.bind(el) ||
          // @ts-expect-error vendor-prefixed requestFullscreen
          el.webkitRequestFullscreen?.bind(el) ||
          // @ts-expect-error vendor-prefixed requestFullscreen
          el.msRequestFullscreen?.bind(el);
        if (req) {
          await req();
          setIsFullscreen(true);
        }
      } else {
        const exit =
          document.exitFullscreen?.bind(document) ||
          // @ts-expect-error vendor-prefixed exitFullscreen
          document.webkitExitFullscreen?.bind(document) ||
          // @ts-expect-error vendor-prefixed exitFullscreen
          document.msExitFullscreen?.bind(document);
        if (exit) {
          await exit();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error('Fullscreen failed:', err);
      // Fallback: open same-origin player shell in a new window
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <section
      ref={containerRef}
      className={`rounded-2xl overflow-hidden border border-neutral-800 bg-black ${
        isFullscreen ? 'rounded-none border-0' : ''
      } ${className}`}
      aria-label={`${title} video player`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-neutral-950 border-b border-neutral-800">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">Watch · {title}</p>
          <p className="text-[10px] text-neutral-500">
            Authorized {label} playback
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[9px] font-bold uppercase tracking-wide text-neutral-300">
              {label}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRetry}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
            title="Reload stream"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              void toggleFullscreen();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className={`relative w-full bg-black ${isFullscreen ? 'h-[calc(100vh-44px)]' : 'aspect-video'}`}>
        {loading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-neutral-950/90 text-neutral-300">
            <Loader2 className="w-7 h-7 animate-spin text-red-500" />
            <p className="text-xs">Loading stream…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center bg-neutral-950">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-neutral-300">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-white cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        <iframe
          key={reloadKey}
          title={`${title} — ${label}`}
          src={src}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen *"
          allowFullScreen
          referrerPolicy="no-referrer"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError('Network error while loading the stream player.');
          }}
        />

        {!loading && !error && !playbackArmed && (
          <button
            type="button"
            onClick={armPlayback}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/75 text-white cursor-pointer border-0"
            aria-label={`Start watching ${title}`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg shadow-red-900/40">
              <Play className="h-7 w-7 fill-white translate-x-0.5" />
            </span>
            <span className="text-sm font-semibold tracking-wide">Click to play</span>
            <span className="max-w-[16rem] text-[11px] text-neutral-400 text-center px-4">
              Tap once to start — blocks the first provider ad popup
            </span>
          </button>
        )}
      </div>
    </section>
  );
};

/** @deprecated Prefer ProviderPlayer — kept for existing imports */
export const NexStreamPlayer = ProviderPlayer;
