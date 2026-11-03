import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Link,
  Code,
  Sparkles,
  Layout,
  Smartphone,
  Monitor,
  AlertCircle,
  Eye,
  ExternalLink
} from 'lucide-react';
import { AdSlot, AdPosition, AdNetwork, AdDevice } from '../../../types.ts';
import { api } from '../../../services/api.ts';

interface AdSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (slot: AdSlot) => void;
  slotToEdit?: AdSlot | null;
}

export const AdSlotModal: React.FC<AdSlotModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  slotToEdit
}) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<AdPosition>('home_header');
  const [network, setNetwork] = useState<AdNetwork>('adsense');
  const [dimensions, setDimensions] = useState('728x90');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [titleText, setTitleText] = useState('');
  const [badgeLabel, setBadgeLabel] = useState<'Advertisement' | 'Sponsored'>('Sponsored');
  const [enabled, setEnabled] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [targetDevice, setTargetDevice] = useState<AdDevice>('all');
  const [cpmRate, setCpmRate] = useState<number>(2.0);
  const [cpcRate, setCpcRate] = useState<number>(0.4);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const positionOptions: Array<{ id: AdPosition; label: string; group: string }> = [
    // Homepage
    { id: 'home_header', label: 'Top Header Banner (728x90)', group: 'Homepage' },
    { id: 'home_below_nav', label: 'Below Navigation Ribbon (970x90)', group: 'Homepage' },
    { id: 'home_between_sections', label: 'Between Movie Sections (970x250)', group: 'Homepage' },
    { id: 'home_between_cards', label: 'Between Movie Cards (In-Feed Native)', group: 'Homepage' },
    { id: 'home_footer', label: 'Footer Banner (728x90)', group: 'Homepage' },
    // Sidebars
    { id: 'desktop_left_sidebar', label: 'Left Desktop Skyscraper (160x600)', group: 'Sidebars (Desktop)' },
    { id: 'desktop_right_sidebar', label: 'Right Desktop Half-Page (300x600)', group: 'Sidebars (Desktop)' },
    // Movie Details Page
    { id: 'movie_details_top', label: 'Above Movie Info Banner (728x90)', group: 'Movie Details Page' },
    { id: 'movie_details_below_poster', label: 'Below Movie Poster (300x250)', group: 'Movie Details Page' },
    { id: 'movie_details_mid', label: 'Between Description & Specs (Responsive)', group: 'Movie Details Page' },
    { id: 'movie_details_before_watch', label: 'Before Watch Now Button (468x60)', group: 'Movie Details Page' },
    { id: 'movie_details_below_related', label: 'Below Related Movies (728x90)', group: 'Movie Details Page' },
    // Player Page
    { id: 'player_above', label: 'Banner Above Video Player (728x90)', group: 'Video Player Page' },
    { id: 'player_sidebar_left', label: 'Left Sidebar Beside Player (160x600)', group: 'Video Player Page' },
    { id: 'player_sidebar_right', label: 'Right Sidebar Beside Player (160x600)', group: 'Video Player Page' },
    { id: 'player_below', label: 'Banner Below Video Player (970x250)', group: 'Video Player Page' },
    // Popup
    { id: 'popup_under', label: 'Compliant New Tab Popunder', group: 'Popup & New Tab' }
  ];

  const networkOptions: Array<{ id: AdNetwork; label: string }> = [
    { id: 'adsense', label: 'Google AdSense' },
    { id: 'admanager', label: 'Google Ad Manager (DFP)' },
    { id: 'monetag', label: 'Monetag' },
    { id: 'adsterra', label: 'Adsterra' },
    { id: 'custom', label: 'Custom HTML / JS Network' }
  ];

  useEffect(() => {
    if (slotToEdit) {
      setName(slotToEdit.name);
      setPosition(slotToEdit.position);
      setNetwork(slotToEdit.network);
      setDimensions(slotToEdit.dimensions);
      setCodeSnippet(slotToEdit.codeSnippet || '');
      setTargetUrl(slotToEdit.targetUrl || '');
      setImageUrl(slotToEdit.imageUrl || '');
      setTitleText(slotToEdit.titleText || '');
      setBadgeLabel(slotToEdit.badgeLabel || 'Sponsored');
      setEnabled(slotToEdit.enabled);
      setIsSticky(slotToEdit.isSticky);
      setTargetDevice(slotToEdit.targetDevice || 'all');
      setCpmRate(slotToEdit.cpmRate || 2.0);
      setCpcRate(slotToEdit.cpcRate || 0.4);
      setStartDate(slotToEdit.startDate || '');
      setEndDate(slotToEdit.endDate || '');
    } else {
      setName('');
      setPosition('home_header');
      setNetwork('adsense');
      setDimensions('728x90');
      setCodeSnippet('<!-- Insert Network Ad Tag or Script -->');
      setTargetUrl('https://example.com/partner');
      setImageUrl('https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&auto=format&fit=crop&q=80');
      setTitleText('High Performance Cinema Display Sponsor');
      setBadgeLabel('Sponsored');
      setEnabled(true);
      setIsSticky(false);
      setTargetDevice('all');
      setCpmRate(2.5);
      setCpcRate(0.5);
      setStartDate('');
      setEndDate('');
    }
    setError(null);
  }, [slotToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ad Slot Name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: name.trim(),
        position,
        network,
        dimensions: dimensions.trim() || 'responsive',
        codeSnippet: codeSnippet.trim(),
        targetUrl: targetUrl.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        titleText: titleText.trim() || undefined,
        badgeLabel,
        enabled,
        isSticky,
        targetDevice,
        cpmRate: Number(cpmRate) || 2.0,
        cpcRate: Number(cpcRate) || 0.4,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      let resultSlot: AdSlot;
      if (slotToEdit) {
        const res = await api.updateAdminAdSlot(slotToEdit.id, payload);
        resultSlot = res.slot;
      } else {
        const res = await api.createAdminAdSlot(payload);
        resultSlot = res.slot;
      }

      onSaveSuccess(resultSlot);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save ad slot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl z-10 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800/80 bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {slotToEdit ? 'Edit Advertisement Slot' : 'Create New Advertisement Slot'}
              </h2>
              <p className="text-xs text-neutral-400">
                Configure placement position, dimensions, ad network code, and pricing rates
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Slot Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Ad Slot Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Header Leaderboard 728x90"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              required
            />
          </div>

          {/* Placement Position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Ad Placement Position
              </label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value as AdPosition)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {positionOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    [{opt.group}] {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Ad Network Integration
              </label>
              <select
                value={network}
                onChange={e => setNetwork(e.target.value as AdNetwork)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 cursor-pointer"
              >
                {networkOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dimensions & Device */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Dimensions / Size
              </label>
              <input
                type="text"
                value={dimensions}
                onChange={e => setDimensions(e.target.value)}
                placeholder="728x90, 300x250, 160x600, 970x250, responsive"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Target Device
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Devices' },
                  { id: 'desktop', label: 'Desktop' },
                  { id: 'mobile', label: 'Mobile' }
                ].map(dev => (
                  <button
                    type="button"
                    key={dev.id}
                    onClick={() => setTargetDevice(dev.id as AdDevice)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      targetDevice === dev.id
                        ? 'bg-red-600 text-white border-red-500 shadow'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    {dev.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Creative Title & Destination Target URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Sponsor Title / Headline
              </label>
              <input
                type="text"
                value={titleText}
                onChange={e => setTitleText(e.target.value)}
                placeholder="e.g. Upgrade to Gigabit Fiber Streaming"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Target Destination URL (Clicks)
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://sponsor-website.com/deal"
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 font-mono text-xs"
              />
            </div>
          </div>

          {/* Creative Banner Image */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Banner Image URL (Creative Artwork)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 font-mono text-xs"
            />
            {imageUrl && (
              <div className="mt-2 p-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center gap-3">
                <img
                  src={imageUrl}
                  alt="Creative preview"
                  className="h-12 w-24 object-cover rounded-lg border border-neutral-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&auto=format&fit=crop&q=80';
                  }}
                />
                <span className="text-xs text-neutral-400">Creative preview loaded</span>
              </div>
            )}
          </div>

          {/* Script / Ad Code Snippet */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Ad Network Script / Code Snippet</span>
              <span className="text-[11px] text-neutral-500 font-normal">HTML / JavaScript</span>
            </label>
            <textarea
              value={codeSnippet}
              onChange={e => setCodeSnippet(e.target.value)}
              rows={3}
              placeholder="<script async src='https://pagead2.googlesyndication.com/...'>..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2 text-xs font-mono text-neutral-300 focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          {/* Revenue Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Estimated CPM Rate ($ / 1000 views)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={cpmRate}
                onChange={e => setCpmRate(parseFloat(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Estimated CPC Rate ($ / click)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={cpcRate}
                onChange={e => setCpcRate(parseFloat(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Sticky & Status Switches */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
              <span className="font-semibold">Slot Active / Enabled</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-200">
              <input
                type="checkbox"
                checked={isSticky}
                onChange={e => setIsSticky(e.target.checked)}
                className="w-4 h-4 accent-red-600 rounded cursor-pointer"
              />
              <span>Sticky While Scrolling</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Badge Label:</span>
              <select
                value={badgeLabel}
                onChange={e => setBadgeLabel(e.target.value as any)}
                className="bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="Sponsored">Sponsored</option>
                <option value="Advertisement">Advertisement</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm font-semibold border border-neutral-700 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold shadow-xl shadow-red-950 cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : slotToEdit ? 'Save Changes' : 'Create Ad Slot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
