import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Film,
  Loader2,
  RefreshCw,
  ShieldOff,
  Sparkles,
  XCircle
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { StreamAssociation, StreamingAdminStats, StreamingProviderKey } from '../../types.ts';

export const StreamingManagementTab: React.FC = () => {
  const [configured, setConfigured] = useState(false);
  const [providers, setProviders] = useState<{ nexstream: boolean; vidsrc: boolean }>({
    nexstream: false,
    vidsrc: false
  });
  const [stats, setStats] = useState<StreamingAdminStats | null>(null);
  const [trackedMovies, setTrackedMovies] = useState(0);
  const [tmdbLive, setTmdbLive] = useState<{
    configured: boolean;
    popularTotal: number;
    trendingTotal: number;
    fetchedAt: string;
  } | null>(null);
  const [associations, setAssociations] = useState<StreamAssociation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StreamAssociation | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, listRes] = await Promise.all([
        api.getStreamingStats(),
        api.getStreamAssociations(statusFilter, providerFilter)
      ]);
      setConfigured(statsRes.configured);
      setProviders(statsRes.providers || { nexstream: false, vidsrc: false });
      setStats(statsRes.stats);
      setTrackedMovies(statsRes.trackedMovies ?? 0);
      setTmdbLive(statsRes.tmdbLive ?? null);
      setAssociations(listRes.associations);
    } catch (err: any) {
      setError(err.message || 'Failed to load streaming data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const run = async (fn: () => Promise<void>, successMsg: string) => {
    try {
      setBusy(true);
      setError(null);
      await fn();
      await load();
      flash(successMsg);
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const providerLabel = (value?: string) => {
    const key = String(value || '').toLowerCase();
    if (key === 'vidsrc') return 'Vidsrc';
    if (key === 'nexstream') return 'NexStream';
    return value || '—';
  };

  return (
    <div className="space-y-6">
      {!configured && (
        <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-700/60 text-amber-200 text-sm">
          No streaming providers are configured. Set{' '}
          <code className="text-amber-100">NEXSTREAM_API_KEY</code> for NexStream and/or leave{' '}
          <code className="text-amber-100">VIDSRC_ENABLED=true</code> for Vidsrc, then restart.
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span
          className={`px-2.5 py-1 rounded-lg border ${
            providers.nexstream
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-neutral-900 border-neutral-700 text-neutral-500'
          }`}
        >
          NexStream {providers.nexstream ? 'ready' : 'off'}
        </span>
        <span
          className={`px-2.5 py-1 rounded-lg border ${
            providers.vidsrc
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-neutral-900 border-neutral-700 text-neutral-500'
          }`}
        >
          Vidsrc {providers.vidsrc ? 'ready' : 'off'}
        </span>
        <span className="px-2.5 py-1 rounded-lg border border-neutral-700 text-neutral-400">
          Priority: NexStream → Vidsrc
        </span>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/70 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-950/70 border border-red-700/70 text-red-300 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard
          label="TMDB catalog"
          value={stats?.totalTmdbMovies ?? 0}
          hint={
            tmdbLive?.configured
              ? `Popular ${tmdbLive.popularTotal.toLocaleString()} · Trending ${tmdbLive.trendingTotal.toLocaleString()}`
              : 'Local tracked only'
          }
          icon={<Film className="w-4 h-4 text-sky-400" />}
        />
        <StatCard
          label="Tracked titles"
          value={trackedMovies}
          hint="Synced / imported IDs"
          icon={<Film className="w-4 h-4 text-sky-300" />}
        />
        <StatCard label="NexStream matched" value={stats?.nexstreamMatched ?? 0} icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Vidsrc matched" value={stats?.vidsrcMatched ?? 0} icon={<CheckCircle2 className="w-4 h-4 text-cyan-400" />} />
        <StatCard label="Both providers" value={stats?.bothProviders ?? 0} icon={<Sparkles className="w-4 h-4 text-violet-400" />} />
        <StatCard label="With streams" value={stats?.withVerifiedStreams ?? 0} icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
        <StatCard label="Without streams" value={stats?.withoutStreams ?? 0} icon={<XCircle className="w-4 h-4 text-neutral-400" />} />
        <StatCard label="Provider errors" value={stats?.providerErrors ?? stats?.failedSearches ?? 0} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-xs text-neutral-400">
          Last sync:{' '}
          <span className="text-neutral-200">
            {stats?.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleString() : 'Never'}
          </span>
          {tmdbLive?.fetchedAt ? (
            <span className="text-neutral-500">
              {' '}
              · TMDB live {new Date(tmdbLive.fetchedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy || !configured}
            onClick={() =>
              run(
                async () => {
                  await api.syncStreaming({ onlyUnavailable: true, force: true, limit: 20 });
                },
                'Retry matching completed for unavailable titles.'
              )
            }
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            Retry unavailable
          </button>
          <button
            disabled={busy || !configured}
            onClick={() =>
              run(async () => {
                await api.syncStreaming({ force: true, limit: 20 });
              }, 'Playback status refresh finished.')
            }
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
          >
            Refresh playback status
          </button>
          <button
            disabled={busy || !configured}
            onClick={() =>
              run(async () => {
                await api.syncStreamingFromTmdbList({ list: 'popular', page: 1, force: false });
              }, 'Synced provider matches from TMDB popular list.')
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sync TMDB popular
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {['all', 'available', 'unavailable', 'uncertain', 'failed', 'disabled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize cursor-pointer ${
              statusFilter === s
                ? 'bg-red-600 text-white'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
        <span className="text-neutral-700 px-1">|</span>
        {['all', 'nexstream', 'vidsrc'].map(p => (
          <button
            key={p}
            onClick={() => setProviderFilter(p)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              providerFilter === p
                ? 'bg-sky-700 text-white'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            {p === 'all' ? 'All providers' : providerLabel(p)}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-800 overflow-hidden bg-neutral-950/60">
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-neutral-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading associations…
          </div>
        ) : associations.length === 0 ? (
          <div className="p-10 text-center text-neutral-500 text-sm">
            No stream associations yet. Open a TMDB movie page or run “Sync TMDB popular”.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900 text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">TMDB</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 font-semibold">Matched title</th>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Confidence</th>
                  <th className="px-4 py-3 font-semibold">Checked</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {associations.map(a => (
                  <tr key={a.id} className="border-t border-neutral-800/80 hover:bg-neutral-900/40">
                    <td className="px-4 py-3 text-neutral-300 font-mono">{a.tmdbId}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md border border-neutral-700 bg-neutral-900 text-[10px] font-bold uppercase text-neutral-200">
                        {providerLabel(String(a.providerName))}
                      </span>
                      {a.selectedByAdmin && (
                        <span className="ml-1 text-[9px] text-amber-400 font-semibold">manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white font-medium max-w-[220px] truncate">
                      {a.matchedTitle || '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{a.matchedReleaseYear || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.streamStatus} />
                    </td>
                    <td className="px-4 py-3 text-neutral-400 font-mono text-[10px]">
                      {a.matchConfidence}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {a.lastCheckedAt ? new Date(a.lastCheckedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={busy}
                          onClick={() => setSelected(a)}
                          className="px-2 py-1 rounded-md bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          disabled={busy || !configured}
                          onClick={() =>
                            run(async () => {
                              await api.refreshStreamStatus(a.tmdbId);
                            }, `Refreshed TMDB ${a.tmdbId}`)
                          }
                          className="p-1.5 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 cursor-pointer"
                          title="Refresh"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        {a.streamStatus === 'available' && !a.disabled && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await api.selectStreamProvider(
                                  a.tmdbId,
                                  String(a.providerName).toLowerCase() as StreamingProviderKey,
                                  { confirmOverwriteManual: true }
                                );
                              }, `Selected ${providerLabel(String(a.providerName))} for TMDB ${a.tmdbId}`)
                            }
                            className="px-2 py-1 rounded-md bg-sky-950 text-sky-200 hover:bg-sky-900 cursor-pointer"
                            title="Manually select this provider source"
                          >
                            Use
                          </button>
                        )}
                        {a.streamStatus === 'uncertain' && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              run(async () => {
                                await api.approveUncertainStream(
                                  a.tmdbId,
                                  String(a.providerName).toLowerCase() as StreamingProviderKey
                                );
                              }, `Approved match for TMDB ${a.tmdbId}`)
                            }
                            className="px-2 py-1 rounded-md bg-amber-900/60 text-amber-200 hover:bg-amber-800 cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await api.disableStream(
                                a.tmdbId,
                                a.streamStatus !== 'disabled',
                                String(a.providerName).toLowerCase() as StreamingProviderKey
                              );
                            }, a.streamStatus === 'disabled' ? 'Provider re-enabled' : 'Provider disabled for movie')
                          }
                          className="p-1.5 rounded-md bg-neutral-800 text-red-300 hover:bg-neutral-700 cursor-pointer"
                          title="Disable / enable this provider for the movie"
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-950 border border-neutral-800 p-5 space-y-3 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Provider match</h3>
                <p className="text-xs text-neutral-400">
                  TMDB {selected.tmdbId} · {providerLabel(String(selected.providerName))}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <Detail label="Matched title" value={selected.matchedTitle || '—'} />
              <Detail label="Year" value={String(selected.matchedReleaseYear || '—')} />
              <Detail label="Status" value={selected.streamStatus} />
              <Detail label="Confidence" value={selected.matchConfidence} />
              <Detail label="Provider" value={providerLabel(String(selected.providerName))} />
              <Detail label="Provider movie id" value={selected.providerMovieId || selected.nexstreamProviderId || '—'} />
              <Detail label="IMDb" value={selected.imdbId || '—'} />
              <Detail label="Source" value={selected.matchSource} />
              <Detail label="Playback ref" value={selected.playbackReference} />
              <Detail label="Manual override" value={selected.manualOverride ? 'Yes' : 'No'} />
            </dl>
            {selected.lastError && (
              <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg p-2">
                {selected.lastError}
              </p>
            )}
            {selected.streamStatus === 'available' && !selected.disabled && (
              <a
                href={
                  String(selected.providerName).toLowerCase() === 'vidsrc'
                    ? `/api/vidsrc/player/${selected.tmdbId}`
                    : `/api/nexstream/player/${selected.tmdbId}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Open provider player
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function StatCard({
  label,
  value,
  icon,
  hint
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-1.5">
      <div className="flex items-center justify-between text-neutral-400">
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-black text-white">{value.toLocaleString()}</div>
      {hint ? <div className="text-[10px] text-neutral-500 leading-tight">{hint}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    unavailable: 'bg-neutral-900 text-neutral-400 border-neutral-700',
    uncertain: 'bg-amber-950 text-amber-300 border-amber-800',
    failed: 'bg-red-950 text-red-300 border-red-800',
    disabled: 'bg-neutral-900 text-neutral-500 border-neutral-700'
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${
        styles[status] || styles.unavailable
      }`}
    >
      {status}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-neutral-900 border border-neutral-800 px-2.5 py-2">
      <dt className="text-[10px] text-neutral-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-neutral-200 mt-0.5 break-all">{value}</dd>
    </div>
  );
}
