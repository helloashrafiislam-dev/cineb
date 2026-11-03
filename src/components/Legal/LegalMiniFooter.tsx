import React from 'react';

export type LegalMiniLinkId =
  | 'about'
  | 'contact'
  | 'privacy'
  | 'terms'
  | 'copyright'
  | 'dmca'
  | 'disclaimer';

interface LegalMiniFooterProps {
  onNavigate?: (page: LegalMiniLinkId) => void;
}

const LINKS: Array<[LegalMiniLinkId, string, string]> = [
  ['privacy', 'Privacy', '/privacy'],
  ['terms', 'Terms', '/terms'],
  ['copyright', 'Copyright', '/copyright'],
  ['dmca', 'DMCA', '/dmca'],
  ['disclaimer', 'Disclaimer', '/disclaimer'],
  ['contact', 'Contact', '/contact']
];

function go(path: string) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/** Compact legal links for detail / player surfaces that skip the main site footer. */
export const LegalMiniFooter: React.FC<LegalMiniFooterProps> = ({ onNavigate }) => {
  return (
    <nav
      aria-label="Legal"
      className="mt-8 pt-6 border-t border-neutral-900 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-neutral-600"
    >
      {LINKS.map(([id, label, path]) => (
        <button
          key={id}
          type="button"
          className="hover:text-neutral-300 transition-colors cursor-pointer"
          onClick={() => {
            if (onNavigate) onNavigate(id);
            else go(path);
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
};
