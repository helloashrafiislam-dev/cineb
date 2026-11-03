import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Sliders,
  DollarSign,
  Power,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Shield,
  Smartphone,
  Monitor,
  Layers,
  Save,
  AlertCircle
} from 'lucide-react';
import { AdSlot, AdSettings, AdPosition, AdNetwork } from '../../../types.ts';
import { api } from '../../../services/api.ts';
import { AdSlotModal } from './AdSlotModal.tsx';

interface AdManagementTabProps {
  onAdDataChanged?: () => void;
}

export const AdManagementTab: React.FC<AdManagementTabProps> = ({ onAdDataChanged }) => {
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');

  // Modal states
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotToEdit, setSlotToEdit] = useState<AdSlot | null>(null);
  const [previewSlot, setPreviewSlot] = useState<AdSlot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAdData = async () => {
    try {
      setLoading(true);
      const [slotsRes, settingsRes] = await Promise.all([
        api.getAdminAdSlots(),
        api.getAdminAdSettings()
      ]);
      setSlots(slotsRes.slots);
      setSettings(settingsRes.settings);
    } catch (err) {
      console.error('Failed to load ad management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Master Switch Toggle (Requirement 4: "Provide a master switch to disable all advertisements instantly")
  const handleToggleMaster = async () => {
    if (!settings) return;
    try {
      const nextMaster = !settings.masterEnabled;
      const res = await api.updateAdminAdSettings({ masterEnabled: nextMaster });
      setSettings(res.settings);
      showToast(nextMaster ? 'Monetization ACTIVE: All advertisements enabled.' : 'Monetization DISABLED: All advertisements globally paused.');
      if (onAdDataChanged) onAdDataChanged();
    } catch (err: any) {
      alert(`Failed to toggle master switch: ${err.message}`);
    }
  };

  const handleUpdateSettings = async (updates: Partial<AdSettings>) => {
    try {
      const res = await api.updateAdminAdSettings(updates);
      setSettings(res.settings);
      showToast('Advertising settings updated successfully.');
      if (onAdDataChanged) onAdDataChanged();
    } catch (err: any) {
      alert(`Settings update failed: ${err.message}`);
    }
  };

  const handleToggleSlot = async (slot: AdSlot) => {
    try {
      const res = await api.toggleAdminAdSlot(slot.id);
      setSlots(prev => prev.map(s => s.id === slot.id ? res.slot : s));
      showToast(`Ad slot "${slot.name}" is now ${res.slot.enabled ? 'Enabled' : 'Disabled'}.`);
      if (onAdDataChanged) onAdDataChanged();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleDeleteSlot = async (slot: AdSlot) => {
    if (!window.confirm(`Permanently delete ad slot "${slot.name}"?`)) return;
    try {
      await api.deleteAdminAdSlot(slot.id);
      setSlots(prev => prev.filter(s => s.id !== slot.id));
      showToast(`Ad slot "${slot.name}" deleted.`);
      if (onAdDataChanged) onAdDataChanged();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleOpenAdd = () => {
    setSlotToEdit(null);
    setIsSlotModalOpen(true);
  };

  const handleOpenEdit = (slot: AdSlot) => {
    setSlotToEdit(slot);
    setIsSlotModalOpen(true);
  };

  const handleSaveSuccess = () => {
    fetchAdData();
    showToast('Ad slot saved and live configuration updated.');
    if (onAdDataChanged) onAdDataChanged();
  };

  // Filter slots
  const filteredSlots = slots.filter(slot => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = slot.name.toLowerCase().includes(q) || slot.position.toLowerCase().includes(q) || slot.network.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterPosition !== 'all' && slot.position !== filterPosition) return false;
    if (filterNetwork !== 'all' && slot.network !== filterNetwork) return false;
    return true;
  });

  if (loading && !settings) {
    return <div className="py-20 text-center text-neutral-500">Loading advertisement management...</div>;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-sm flex items-center justify-between shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Master Switch Banner (Requirement 4) */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 ${
        settings?.masterEnabled
          ? 'bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border-emerald-500/50 shadow-xl shadow-emerald-950/20'
          : 'bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 border-red-500/50'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${settings?.masterEnabled ? 'text-emerald-400' : 'text-red-400'}`} />
              <h3 className="text-lg font-black text-white">
                Global Advertisement Master Switch
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                settings?.masterEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {settings?.masterEnabled ? 'ACTIVE (MONETIZING)' : 'DISABLED (ALL ADS PAUSED)'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Instantly toggle all banners, sticky sidebars, native cards, and popup ads platform-wide with one click.
            </p>
          </div>

          <button
            onClick={handleToggleMaster}
            className={`px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition-all cursor-pointer flex items-center gap-2 ${
              settings?.masterEnabled
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{settings?.masterEnabled ? 'Pause All Ads' : 'Enable All Ads'}</span>
          </button>
        </div>
      </div>

      {/* Page-Specific & Popup Controls Grid */}
      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Page Controls */}
          <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-red-500" />
              <span>Page-Specific Ad Toggles</span>
            </h4>

            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 cursor-pointer">
                <span>Homepage Ads</span>
                <input
                  type="checkbox"
                  checked={settings.homeAdsEnabled}
                  onChange={e => handleUpdateSettings({ homeAdsEnabled: e.target.checked })}
                  className="w-4 h-4 accent-red-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 cursor-pointer">
                <span>Movie Details Page Ads</span>
                <input
                  type="checkbox"
                  checked={settings.detailsAdsEnabled}
                  onChange={e => handleUpdateSettings({ detailsAdsEnabled: e.target.checked })}
                  className="w-4 h-4 accent-red-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 cursor-pointer">
                <span>Movie Video Player Ads</span>
                <input
                  type="checkbox"
                  checked={settings.playerAdsEnabled}
                  onChange={e => handleUpdateSettings({ playerAdsEnabled: e.target.checked })}
                  className="w-4 h-4 accent-red-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* Popup & Frequency Cap Settings (Requirement 2) */}
          <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Popup & New Tab Ads</span>
              </h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.popupEnabled}
                  onChange={e => handleUpdateSettings({ popupEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">
                  Frequency Cap (Max 1 per X minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={settings.popupFrequencyMinutes}
                  onChange={e => handleUpdateSettings({ popupFrequencyMinutes: parseInt(e.target.value, 10) || 30 })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Popup Destination Target</label>
                <input
                  type="url"
                  value={settings.popupTargetUrl}
                  onChange={e => handleUpdateSettings({ popupTargetUrl: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/50 text-[11px] text-red-200/90 space-y-1">
                <p className="font-bold text-red-300">AdSense policy: card-click ads disabled</p>
                <p>
                  Hijacking movie-card or Play clicks to open ads is deceptive and risks invalid
                  traffic. The site code ignores cardClickAdEnabled even if re-enabled here.
                </p>
              </div>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 opacity-60 cursor-not-allowed">
                <div>
                  <span className="block text-neutral-200">Movie Card Click → Ad (blocked)</span>
                  <span className="text-[10px] text-neutral-500">
                    Permanently disabled in application code for compliance
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={false}
                  disabled
                  className="w-4 h-4 accent-amber-500 rounded"
                />
              </label>
            </div>
          </div>

          {/* Performance & UX Optimizations (Requirement 7) */}
          <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Performance & UX Settings</span>
            </h4>

            <div className="space-y-2 pt-1 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 cursor-pointer">
                <div>
                  <span className="block font-semibold">Lazy-Load Below The Fold</span>
                  <span className="text-[10px] text-neutral-500">Loads ads via IntersectionObserver</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.lazyLoadBelowFold}
                  onChange={e => handleUpdateSettings({ lazyLoadBelowFold: e.target.checked })}
                  className="w-4 h-4 accent-red-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 cursor-pointer">
                <div>
                  <span className="block font-semibold">Reserve Container Sizing</span>
                  <span className="text-[10px] text-neutral-500">Prevents layout shifts (Anti-CLS)</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reserveContainerDimensions}
                  onChange={e => handleUpdateSettings({ reserveContainerDimensions: e.target.checked })}
                  className="w-4 h-4 accent-red-600 rounded"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Ad Slots Management Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-xl shadow-red-950 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Ad Slot</span>
          </button>
          <span className="text-[11px] text-neutral-500">
            {slots.length} slots · impressions/clicks from live site tracking
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Position Filter */}
          <select
            value={filterPosition}
            onChange={e => setFilterPosition(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Placements</option>
            <option value="home_header">Homepage Header</option>
            <option value="home_between_sections">Between Sections</option>
            <option value="desktop_left_sidebar">Left Sidebar</option>
            <option value="desktop_right_sidebar">Right Sidebar</option>
            <option value="player_above">Player Top</option>
            <option value="player_below">Player Bottom</option>
            <option value="popup_under">Popup / Popunder</option>
          </select>

          {/* Network Filter */}
          <select
            value={filterNetwork}
            onChange={e => setFilterNetwork(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Networks</option>
            <option value="adsense">Google AdSense</option>
            <option value="admanager">Google Ad Manager</option>
            <option value="monetag">Monetag</option>
            <option value="adsterra">Adsterra</option>
            <option value="custom">Custom Network</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search slots..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white w-44"
            />
          </div>
        </div>
      </div>

      {/* Ad Slots Table */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950/80 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-4">Ad Slot Name</th>
                <th className="py-3.5 px-4">Placement & Network</th>
                <th className="py-3.5 px-4">Size & Device</th>
                <th className="py-3.5 px-4">Impressions / Clicks</th>
                <th className="py-3.5 px-4">Est. Revenue</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500">
                    No advertisement slots found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSlots.map(slot => (
                  <tr key={slot.id} className="hover:bg-neutral-900/40 transition-colors">
                    {/* Slot Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{slot.name}</span>
                        {slot.isSticky && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold">
                            Sticky
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 truncate max-w-xs">
                        {slot.titleText || 'Standard Network Creative'}
                      </div>
                    </td>

                    {/* Placement & Network */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-neutral-200 block">
                          {slot.position.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono uppercase">
                          {slot.network}
                        </span>
                      </div>
                    </td>

                    {/* Size & Device */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-mono text-white">{slot.dimensions}</div>
                      <div className="text-[11px] text-neutral-400 capitalize">{slot.targetDevice}</div>
                    </td>

                    {/* Impressions & Clicks */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-neutral-200 font-semibold">
                        {slot.impressions.toLocaleString()} views
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {slot.clicks.toLocaleString()} clicks (
                        {slot.impressions > 0 ? ((slot.clicks / slot.impressions) * 100).toFixed(1) : '0'}% CTR)
                      </div>
                    </td>

                    {/* Est. Revenue */}
                    <td className="py-3.5 px-4">
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        ${slot.estimatedEarnings.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        CPM: ${slot.cpmRate.toFixed(2)} | CPC: ${slot.cpcRate.toFixed(2)}
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleSlot(slot)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          slot.enabled
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
                            : 'bg-neutral-800 text-neutral-500 border-neutral-700 hover:text-white'
                        }`}
                      >
                        {slot.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewSlot(slot)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                          title="Preview creative"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(slot)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer"
                          title="Edit ad slot"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-900/60 text-neutral-400 hover:text-red-300 transition-colors cursor-pointer"
                          title="Delete slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ad Slot Modal */}
      <AdSlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onSaveSuccess={handleSaveSuccess}
        slotToEdit={slotToEdit}
      />

      {/* Ad Preview Modal */}
      {previewSlot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setPreviewSlot(null)} />
          <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-red-500" />
                <span>Ad Creative Preview: {previewSlot.name}</span>
              </h3>
              <button
                onClick={() => setPreviewSlot(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col items-center justify-center space-y-3">
              <div className="text-[10px] font-bold text-neutral-500 uppercase">
                {previewSlot.badgeLabel} • {previewSlot.network.toUpperCase()} • {previewSlot.dimensions}
              </div>

              {previewSlot.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-neutral-700 max-h-56">
                  <img src={previewSlot.imageUrl} alt="preview" className="w-full object-cover" />
                </div>
              )}

              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">{previewSlot.titleText || previewSlot.name}</h4>
                {previewSlot.targetUrl && (
                  <a
                    href={previewSlot.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-red-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{previewSlot.targetUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewSlot(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
