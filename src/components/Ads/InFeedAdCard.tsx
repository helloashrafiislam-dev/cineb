import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { AdSlot } from '../../types.ts';
import { api } from '../../services/api.ts';

interface InFeedAdCardProps {
  slot?: AdSlot;
}

export const InFeedAdCard: React.FC<InFeedAdCardProps> = ({ slot }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [recorded, setRecorded] = useState(false);

  useEffect(() => {
    if (!slot || recorded) return;
    const isMobile = window.innerWidth < 768;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            api.recordAdImpression(slot.id, isMobile ? 'mobile' : 'desktop');
            setRecorded(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [slot, recorded]);

  if (!slot || !slot.enabled) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isMobile = window.innerWidth < 768;
    api.recordAdClick(slot.id, isMobile ? 'mobile' : 'desktop');
    if (slot.targetUrl) {
      window.open(slot.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const imageSrc = slot.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80';

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      role="complementary"
      aria-label="Advertisement"
      className="relative shrink-0 w-40 sm:w-48 md:w-56 min-h-[14rem] rounded-xl overflow-hidden bg-neutral-950 border-2 border-dashed border-amber-500/50 shadow-md hover:border-amber-400 transition-colors cursor-pointer group flex flex-col"
    >
      <div className="px-2.5 py-1.5 bg-amber-500 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          Advertisement
        </span>
        <span className="font-mono opacity-80">{slot.network}</span>
      </div>

      <div className="relative flex-1 min-h-[7rem]">
        <img
          src={imageSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter brightness-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
      </div>

      <div className="relative z-10 p-3 space-y-2 border-t border-amber-500/20">
        <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Sponsored
        </span>
        <h4 className="text-white text-xs sm:text-sm font-bold line-clamp-2 leading-snug">
          {slot.titleText || slot.name}
        </h4>
        <span className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-neutral-800 border border-neutral-600 text-neutral-100 font-semibold text-xs">
          <span>Learn More</span>
          <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
