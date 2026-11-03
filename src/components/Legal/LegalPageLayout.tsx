import React from 'react';
import { ArrowLeft, Film } from 'lucide-react';

interface LegalPageLayoutProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  onBack: () => void;
  children: React.ReactNode;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  subtitle,
  lastUpdated = 'November 4, 2026',
  onBack,
  children
}) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <div className="border-b border-neutral-900 bg-neutral-950/90">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-start gap-4">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Film className="w-3.5 h-3.5" />
              <span>CineStream</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{subtitle}</p>}
            <p className="mt-3 text-[11px] text-neutral-600">Last updated: {lastUpdated}</p>
          </div>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 text-sm leading-relaxed text-neutral-300">
        {children}
      </article>
    </div>
  );
};

export const LegalSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children
}) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold text-white">{title}</h2>
    <div className="space-y-2 text-neutral-400">{children}</div>
  </section>
);
