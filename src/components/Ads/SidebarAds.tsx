import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { AdSlot, AdSettings } from '../../types.ts';
import { api } from '../../services/api.ts';

interface SidebarAdsProps {
  slots: AdSlot[];
  settings: AdSettings;
}

export const SidebarAds: React.FC<SidebarAdsProps> = ({ slots, settings }) => {
  const [recordedLeft, setRecordedLeft] = useState(false);
  const [recordedRight, setRecordedRight] = useState(false);

  if (!settings.masterEnabled) return null;

  const leftSlot = slots.find(s => s.position === 'desktop_left_sidebar' && s.enabled && s.targetDevice !== 'mobile');
  const rightSlot = slots.find(s => s.position === 'desktop_right_sidebar' && s.enabled && s.targetDevice !== 'mobile');

  useEffect(() => {
    if (leftSlot && !recordedLeft) {
      api.recordAdImpression(leftSlot.id, 'desktop');
      setRecordedLeft(true);
    }
    if (rightSlot && !recordedRight) {
      api.recordAdImpression(rightSlot.id, 'desktop');
      setRecordedRight(true);
    }
  }, [leftSlot, rightSlot, recordedLeft, recordedRight]);

  const handleSlotClick = (slot: AdSlot) => {
    api.recordAdClick(slot.id, 'desktop');
    if (slot.targetUrl) {
      window.open(slot.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <>
      {/* Left Sidebar Ad */}
      {leftSlot && (
        <aside
          aria-label="Sponsored advertisement"
          className="hidden 2xl:flex fixed left-3 top-28 z-20 flex-col items-center w-[160px] select-none"
        >
          <div className="w-full flex items-center justify-between px-1 mb-1 text-[9px] uppercase font-bold tracking-wider text-neutral-500">
            <span className="flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>{leftSlot.badgeLabel}</span>
            </span>
            <span className="font-mono text-neutral-600">{leftSlot.network}</span>
          </div>

          <div
            onClick={() => handleSlotClick(leftSlot)}
            className="w-[160px] h-[600px] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl hover:border-neutral-700 transition-all duration-300 cursor-pointer relative group flex flex-col justify-between"
          >
            {leftSlot.imageUrl ? (
              <div className="relative w-full h-full flex flex-col justify-between p-3 bg-neutral-950">
                <img
                  src={leftSlot.imageUrl}
                  alt={leftSlot.titleText || 'Left Sponsor'}
                  className="absolute inset-0 w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/70" />

                <div className="relative z-10 pt-2 text-center">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                    Exclusive Sponsor
                  </span>
                </div>

                <div className="relative z-10 space-y-2 pb-2 text-center">
                  <p className="text-xs font-bold text-white line-clamp-3 leading-snug">
                    {leftSlot.titleText || leftSlot.name}
                  </p>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 group-hover:bg-red-500 text-white font-bold text-[10px] shadow-md transition-colors w-full justify-center">
                    <span>Visit Site</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 flex flex-col items-center justify-center text-center h-full space-y-2">
                <span className="text-[10px] text-neutral-500 uppercase">{leftSlot.network}</span>
                <p className="text-xs font-bold text-white">{leftSlot.titleText || leftSlot.name}</p>
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <span>Visit Sponsor</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Right Sidebar Ad */}
      {rightSlot && (
        <aside
          aria-label="Sponsored advertisement"
          className="hidden 2xl:flex fixed right-3 top-28 z-20 flex-col items-center w-[160px] 3xl:w-[300px] select-none"
        >
          <div className="w-full flex items-center justify-between px-1 mb-1 text-[9px] uppercase font-bold tracking-wider text-neutral-500">
            <span className="flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>{rightSlot.badgeLabel}</span>
            </span>
            <span className="font-mono text-neutral-600">{rightSlot.network}</span>
          </div>

          <div
            onClick={() => handleSlotClick(rightSlot)}
            className="w-[160px] 3xl:w-[300px] h-[600px] rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl hover:border-neutral-700 transition-all duration-300 cursor-pointer relative group flex flex-col justify-between"
          >
            {rightSlot.imageUrl ? (
              <div className="relative w-full h-full flex flex-col justify-between p-3 bg-neutral-950">
                <img
                  src={rightSlot.imageUrl}
                  alt={rightSlot.titleText || 'Right Sponsor'}
                  className="absolute inset-0 w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/70" />

                <div className="relative z-10 pt-2 text-center">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                    Featured Partner
                  </span>
                </div>

                <div className="relative z-10 space-y-2 pb-2 text-center">
                  <p className="text-xs font-bold text-white line-clamp-3 leading-snug">
                    {rightSlot.titleText || rightSlot.name}
                  </p>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 group-hover:bg-red-500 text-white font-bold text-[10px] shadow-md transition-colors w-full justify-center">
                    <span>Explore Offer</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 flex flex-col items-center justify-center text-center h-full space-y-2">
                <span className="text-[10px] text-neutral-500 uppercase">{rightSlot.network}</span>
                <p className="text-xs font-bold text-white">{rightSlot.titleText || rightSlot.name}</p>
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <span>Visit Sponsor</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
};
