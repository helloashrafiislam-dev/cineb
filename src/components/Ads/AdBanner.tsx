import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { AdSlot, AdSettings } from '../../types.ts';
import { api } from '../../services/api.ts';

interface AdBannerProps {
  position: string;
  slots: AdSlot[];
  settings: AdSettings;
  className?: string;
  /** Force a large rectangle suitable for side-by-side bottom rows */
  forceLarge?: boolean;
  onAdClick?: (slot: AdSlot) => void;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  position,
  slots,
  settings,
  className = '',
  forceLarge = false,
  onAdClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasRecordedImpression, setHasRecordedImpression] = useState(false);
  const [isClientMobile, setIsClientMobile] = useState(false);

  useEffect(() => {
    setIsClientMobile(window.innerWidth < 768);
    const handleResize = () => setIsClientMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter matching slot for this placement
  const slot = slots.find(s => {
    if (s.position !== position || !s.enabled) return false;
    if (s.targetDevice === 'desktop' && isClientMobile) return false;
    if (s.targetDevice === 'mobile' && !isClientMobile) return false;
    return true;
  });

  // Lazy-load impression detection with IntersectionObserver
  useEffect(() => {
    if (!slot || hasRecordedImpression || !settings.masterEnabled) return;

    const device = isClientMobile ? 'mobile' : 'desktop';

    if (!settings.lazyLoadBelowFold) {
      api.recordAdImpression(slot.id, device);
      setHasRecordedImpression(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            api.recordAdImpression(slot.id, device);
            setHasRecordedImpression(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [slot, hasRecordedImpression, settings, isClientMobile]);

  if (!settings.masterEnabled || !slot) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const device = isClientMobile ? 'mobile' : 'desktop';
    api.recordAdClick(slot.id, device);
    if (onAdClick) onAdClick(slot);
    if (slot.targetUrl) {
      window.open(slot.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Determine sizing styles
  const getDimensionClass = () => {
    if (forceLarge) {
      return 'w-full min-h-[220px] sm:min-h-[280px] h-full';
    }
    switch (slot.dimensions) {
      case '728x90':
        return 'w-full max-w-[728px] h-[90px]';
      case '970x90':
        return 'w-full max-w-[970px] h-[90px]';
      case '970x250':
        return 'w-full max-w-[970px] min-h-[140px] sm:h-[250px]';
      case '300x250':
        return 'w-full max-w-[300px] h-[250px] mx-auto';
      case '468x60':
        return 'w-full max-w-[468px] h-[60px]';
      case '160x600':
        return 'w-[160px] h-[600px]';
      case '300x600':
        return 'w-[300px] h-[600px]';
      case '320x50':
        return 'w-full max-w-[320px] h-[50px] mx-auto';
      default:
        return 'w-full min-h-[90px]';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative my-4 flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* Policy-Compliant Labeling (Requirement 8) */}
      <div className="w-full flex items-center justify-between px-2 py-0.5 max-w-[970px] mb-1">
        <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-neutral-500" />
          <span>{slot.badgeLabel || 'Advertisement'}</span>
        </span>
        <span className="text-[9px] uppercase font-semibold text-neutral-600 font-mono">
          {slot.network.toUpperCase()}
        </span>
      </div>

      {/* Ad Box Container */}
      <div
        onClick={handleClick}
        className={`group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/90 shadow-md hover:border-neutral-700 transition-all duration-300 cursor-pointer flex items-center justify-center ${getDimensionClass()} ${
          slot.isSticky ? 'sticky top-20 z-20' : ''
        }`}
      >
        {slot.imageUrl ? (
          <div className="relative w-full h-full flex items-center justify-between bg-neutral-950">
            <img
              src={slot.imageUrl}
              alt={slot.titleText || 'Sponsor Promotion'}
              className="w-full h-full object-cover filter brightness-90 group-hover:scale-102 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&auto=format&fit=crop&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/60 to-transparent p-4 flex flex-col justify-center">
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-400" />
                Featured Sponsor
              </span>
              <h4 className="text-white font-bold text-xs sm:text-sm md:text-base line-clamp-2 max-w-xl group-hover:text-red-300 transition-colors">
                {slot.titleText || slot.name}
              </h4>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 group-hover:bg-red-500 text-white font-bold text-[11px] shadow-sm transition-colors">
                  <span>Learn More</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
                <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                  {slot.targetUrl?.replace(/^https?:\/\//, '').split('/')[0]}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center space-y-1 bg-gradient-to-r from-neutral-900 to-neutral-950">
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
              {slot.network.toUpperCase()} Ad Placement ({slot.dimensions})
            </span>
            <p className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">
              {slot.titleText || slot.name}
            </p>
            {slot.targetUrl && (
              <span className="text-xs text-red-400 group-hover:underline flex items-center gap-1">
                <span>Visit Sponsor</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
