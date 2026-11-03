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
      className="relative shrink-0 w-40 sm:w-48 md:w-56 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-900 border border-amber-500/40 shadow-lg hover:shadow-2xl hover:border-amber-400 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group flex flex-col justify-between"
    >
      <img
        src={imageSrc}
        alt={slot.titleText || 'Sponsored'}
        className="absolute inset-0 w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/60" />

      {/* Top Badge */}
      <div className="relative z-10 p-2.5 flex items-center justify-between">
        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold flex items-center gap-1 shadow-md">
          <Sparkles className="w-2.5 h-2.5 fill-black" />
          <span>Sponsored</span>
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-neutral-300 font-mono">
          {slot.network}
        </span>
      </div>

      {/* Bottom Content */}
      <div className="relative z-10 p-3 space-y-2">
        <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
          Partner Spotlight
        </span>
        <h4 className="text-white text-xs sm:text-sm font-bold line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
          {slot.titleText || slot.name}
        </h4>
        <div className="pt-1">
          <span className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow">
            <span>Learn More</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
