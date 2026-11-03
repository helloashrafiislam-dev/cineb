import React, { useEffect, useState } from 'react';
import { ExternalLink, X, Sparkles, ShieldCheck } from 'lucide-react';
import { AdSlot, AdSettings } from '../../types.ts';
import { api } from '../../services/api.ts';

interface PopupAdManagerProps {
  slots: AdSlot[];
  settings: AdSettings;
}

const POPUP_STORAGE_KEY = 'cinestream_last_popup_time';

export const PopupAdManager: React.FC<PopupAdManagerProps> = ({ slots, settings }) => {
  const [showCompliancePrompt, setShowCompliancePrompt] = useState(false);
  const [popupSlot, setPopupSlot] = useState<AdSlot | null>(null);

  useEffect(() => {
    if (!settings.masterEnabled || !settings.popupEnabled) {
      return;
    }

    const slot = slots.find(s => s.position === 'popup_under' && s.enabled);
    if (!slot) return;
    setPopupSlot(slot);

    // Check frequency cap
    const lastTrigger = localStorage.getItem(POPUP_STORAGE_KEY);
    const now = Date.now();
    const frequencyMs = (settings.popupFrequencyMinutes || 30) * 60 * 1000;

    if (lastTrigger && now - parseInt(lastTrigger, 10) < frequencyMs) {
      // Frequency capped, do not trigger
      return;
    }

    // Schedule a policy-compliant offer prompt after a brief engaging period (12 seconds)
    const timer = setTimeout(() => {
      setShowCompliancePrompt(true);
      // Record impression
      api.recordAdImpression(slot.id, window.innerWidth < 768 ? 'mobile' : 'desktop');
      localStorage.setItem(POPUP_STORAGE_KEY, now.toString());
    }, 12000);

    return () => clearTimeout(timer);
  }, [slots, settings]);

  if (!showCompliancePrompt || !popupSlot || !settings.masterEnabled || !settings.popupEnabled) {
    return null;
  }

  const handleOpenSponsor = () => {
    api.recordAdClick(popupSlot.id, window.innerWidth < 768 ? 'mobile' : 'desktop');
    const target = popupSlot.targetUrl || settings.popupTargetUrl || 'https://nordvpn.com/stream-safely';
    window.open(target, '_blank', 'noopener,noreferrer');
    setShowCompliancePrompt(false);
  };

  const handleDismiss = () => {
    setShowCompliancePrompt(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-fadeIn select-none">
      <div className="relative p-5 rounded-2xl bg-neutral-900 border border-neutral-700 shadow-2xl backdrop-blur-xl space-y-3">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Dismiss sponsor announcement"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sponsor Tag */}
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Sponsored Recommendation</span>
        </div>

        {/* Headline */}
        <div className="space-y-1 pr-6">
          <h4 className="text-sm font-bold text-white leading-snug">
            {popupSlot.titleText || 'High-Speed Secure Streaming Partner'}
          </h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Protect your streaming privacy and prevent ISP bandwidth throttling with our verified partner.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleOpenSponsor}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950 cursor-pointer transition-colors"
          >
            <span>Open Sponsor Offer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            No thanks
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-800">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-neutral-500" />
            <span>Policy Compliant (Capped: {settings.popupFrequencyMinutes}m)</span>
          </span>
          <span className="font-mono uppercase">{popupSlot.network}</span>
        </div>
      </div>
    </div>
  );
};
