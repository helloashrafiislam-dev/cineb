import React from 'react';
import { AdSlot, AdSettings, AdPosition } from '../../types.ts';
import { AdBanner } from './AdBanner.tsx';

interface BottomAdsRowProps {
  slots: AdSlot[];
  settings: AdSettings;
  /** Prefer two large side-by-side placements */
  positions?: AdPosition[];
  className?: string;
}

/**
 * Large bottom ad row — two units side by side on desktop.
 * Never used at the top of a page.
 */
export const BottomAdsRow: React.FC<BottomAdsRowProps> = ({
  slots,
  settings,
  positions = ['movie_details_below_related', 'home_footer'],
  className = ''
}) => {
  if (!settings.masterEnabled) return null;

  const enabled = positions.filter(pos =>
    slots.some(s => s.position === pos && s.enabled)
  );

  if (enabled.length === 0) return null;

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`grid gap-4 sm:gap-6 ${
          enabled.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {enabled.map(pos => (
          <AdBanner
            key={pos}
            position={pos}
            slots={slots}
            settings={settings}
            forceLarge
            className="my-0 w-full"
          />
        ))}
      </div>
    </div>
  );
};
