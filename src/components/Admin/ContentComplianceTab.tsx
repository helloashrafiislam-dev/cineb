import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  FileWarning,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api.ts';
import type {
  ContentProviderRecord,
  CopyrightComplaint,
  ProviderAuthStatus,
  SiteComplianceSettings
} from '../../types.ts';

export const ContentComplianceTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<ContentProviderRecord[]>([]);
  const [settings, setSettings] = useState<SiteComplianceSettings | null>(null);
  const [complaints, setComplaints] = useState<CopyrightComplaint[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prov, comps] = await Promise.all([
        api.getComplianceProviders(),
        api.getComplianceComplaints()
      ]);
      setProviders(prov.providers);
      setSettings(prov.settings);
      setComplaints(comps.complaints);
    } catch (err: any) {
      setError(err.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3500);
  };

  const saveSettings = async (updates: Partial<SiteComplianceSettings>) => {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await api.updateComplianceSettings(updates);
      setSettings(res.settings);
      flash('Compliance settings saved');
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveProvider = async (
    providerKey: string,
    updates: Partial<ContentProviderRecord>
  ) => {
    try {
      setSaving(true);
      setError(null);
      const res = await api.updateComplianceProvider(providerKey, updates);
      setProviders(prev => prev.map(p => (p.providerKey === providerKey ? res.provider : p)));
      flash(`Updated ${res.provider.displayName}`);
    } catch (err: any) {
      setError(err.message || 'Provider update failed');
    } finally {
      setSaving(false);
    }
  };

  const updateComplaint = async (
    id: string,
    body: Record<string, unknown>
  ) => {
    try {
      setSaving(true);
      const res = await api.updateComplianceComplaint(id, body);
      setComplaints(prev => prev.map(c => (c.id === id ? res.complaint : c)));
      flash('Complaint updated');
      await load();
    } catch (err: any) {
      setError(err.message || 'Complaint update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading Content Compliance…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            Content Compliance
          </h2>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Providers default to Unverified. Do not mark Verified unless you have real authorization
            or licensing evidence. A public embed URL is not a commercial license.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 hover:text-white cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {message && (
        <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 rounded-xl px-3 py-2">
          {message}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {settings && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Site legal & playback policy
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <label className="space-y-1">
              <span className="text-neutral-500">Site name</span>
              <input
                value={settings.siteName}
                onChange={e => setSettings({ ...settings, siteName: e.target.value })}
                onBlur={() => saveSettings({ siteName: settings.siteName })}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-neutral-500">Legal entity name</span>
              <input
                value={settings.legalEntityName}
                onChange={e => setSettings({ ...settings, legalEntityName: e.target.value })}
                onBlur={() => saveSettings({ legalEntityName: settings.legalEntityName })}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-neutral-500">Contact email</span>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={e => setSettings({ ...settings, contactEmail: e.target.value })}
                onBlur={() => saveSettings({ contactEmail: settings.contactEmail })}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-neutral-500">DMCA email</span>
              <input
                type="email"
                value={settings.dmcaEmail}
                onChange={e => setSettings({ ...settings, dmcaEmail: e.target.value })}
                onBlur={() => saveSettings({ dmcaEmail: settings.dmcaEmail })}
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
              />
            </label>
          </div>
          <label className="flex items-start gap-3 p-3 rounded-xl bg-neutral-950 border border-amber-900/40 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.requireVerifiedProvidersForPlayback}
              disabled={saving}
              onChange={e => {
                const next = e.target.checked;
                setSettings({ ...settings, requireVerifiedProvidersForPlayback: next });
                saveSettings({ requireVerifiedProvidersForPlayback: next });
              }}
              className="mt-1 accent-amber-500"
            />
            <span className="text-xs text-neutral-300">
              <strong className="text-amber-300">Require Verified providers for playback</strong>
              <span className="block text-neutral-500 mt-1">
                Recommended for AdSense. When enabled, Unverified/Disabled providers cannot serve
                embeds—even if a match exists. Turning this off does not create a license.
              </span>
            </span>
          </label>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white">Content providers</h3>
        {providers.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            saving={saving}
            onSave={updates => saveProvider(provider.providerKey, updates)}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-red-400" />
          Copyright complaints ({complaints.length})
        </h3>
        {complaints.length === 0 ? (
          <p className="text-xs text-neutral-500 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
            No complaints yet. Public submissions appear here from the DMCA page.
          </p>
        ) : (
          complaints.map(c => (
            <div
              key={c.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-white font-semibold">{c.copyrightedWork}</p>
                  <p className="text-neutral-500">
                    {c.complainantName} · {c.complainantEmail} · {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300 uppercase tracking-wide text-[10px]">
                  {c.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-neutral-400">{c.description}</p>
              <p className="text-neutral-500 break-all">URL: {c.infringingUrl}</p>
              {(c.tmdbId || c.movieId) && (
                <p className="text-neutral-500">
                  TMDB: {c.tmdbId || '—'} · Movie ID: {c.movieId || '—'}
                </p>
              )}
              <textarea
                defaultValue={c.adminNotes}
                placeholder="Admin notes / resolution"
                className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
                id={`notes-${c.id}`}
              />
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateComplaint(c.id, {
                      disableContent: true,
                      adminNotes: (document.getElementById(`notes-${c.id}`) as HTMLTextAreaElement)?.value
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-800 text-red-200 cursor-pointer"
                >
                  Disable disputed playback
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateComplaint(c.id, {
                      status: 'under_review',
                      adminNotes: (document.getElementById(`notes-${c.id}`) as HTMLTextAreaElement)?.value
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 cursor-pointer"
                >
                  Mark under review
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateComplaint(c.id, {
                      status: 'resolved',
                      adminNotes: (document.getElementById(`notes-${c.id}`) as HTMLTextAreaElement)?.value
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-200 cursor-pointer"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    updateComplaint(c.id, {
                      restoreContent: true,
                      status: 'rejected',
                      adminNotes: (document.getElementById(`notes-${c.id}`) as HTMLTextAreaElement)?.value
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-400 cursor-pointer"
                >
                  Reject & restore
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

function ProviderCard({
  provider,
  saving,
  onSave
}: {
  provider: ContentProviderRecord;
  saving: boolean;
  onSave: (updates: Partial<ContentProviderRecord>) => void;
}) {
  const [status, setStatus] = useState<ProviderAuthStatus>(provider.authorizationStatus);
  const [evidence, setEvidence] = useState(provider.authorizationEvidence);
  const [notes, setNotes] = useState(provider.notes);
  const [restrictions, setRestrictions] = useState(provider.restrictions);

  useEffect(() => {
    setStatus(provider.authorizationStatus);
    setEvidence(provider.authorizationEvidence);
    setNotes(provider.notes);
    setRestrictions(provider.restrictions);
  }, [provider]);

  const statusColor =
    status === 'verified'
      ? 'text-emerald-300 border-emerald-800 bg-emerald-950/30'
      : status === 'disabled'
        ? 'text-red-300 border-red-800 bg-red-950/30'
        : 'text-amber-300 border-amber-800 bg-amber-950/30';

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white flex items-center gap-2">
            {status === 'verified' ? (
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
            ) : status === 'disabled' ? (
              <Ban className="w-4 h-4 text-red-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            {provider.displayName}
          </p>
          <p className="text-[11px] text-neutral-500 font-mono">{provider.sourceUrl}</p>
        </div>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
          {status}
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 text-xs">
        <label className="space-y-1 sm:col-span-1">
          <span className="text-neutral-500">Authorization status</span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as ProviderAuthStatus)}
            className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
          >
            <option value="unverified">Unverified</option>
            <option value="verified">Verified</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-neutral-500">Authorization / licensing evidence (required for Verified)</span>
          <input
            value={evidence}
            onChange={e => setEvidence(e.target.value)}
            placeholder="Contract ref, license ID, written permission summary…"
            className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
          />
        </label>
      </div>
      <label className="block text-xs space-y-1">
        <span className="text-neutral-500">Restrictions</span>
        <textarea
          rows={2}
          value={restrictions}
          onChange={e => setRestrictions(e.target.value)}
          className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
        />
      </label>
      <label className="block text-xs space-y-1">
        <span className="text-neutral-500">Internal notes</span>
        <textarea
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full rounded-xl bg-neutral-950 border border-neutral-700 px-3 py-2 text-white"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() =>
          onSave({
            authorizationStatus: status,
            authorizationEvidence: evidence,
            restrictions,
            notes
          })
        }
        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
      >
        Save provider
      </button>
    </div>
  );
}
