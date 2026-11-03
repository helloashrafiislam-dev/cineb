import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  MousePointer,
  Eye,
  Smartphone,
  Monitor,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { AdAnalyticsReport } from '../../../types.ts';
import { api } from '../../../services/api.ts';

export const AdAnalyticsTab: React.FC = () => {
  const [report, setReport] = useState<AdAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminAdAnalytics();
      setReport(res.analytics);
    } catch (err) {
      console.error('Failed to load ad analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading && !report) {
    return (
      <div className="py-20 text-center text-neutral-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-red-500" />
        <p>Loading revenue analytics and impression reports...</p>
      </div>
    );
  }

  if (!report) return null;

  const { summary, byPosition, byNetwork, byDevice, dailyReports } = report;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            <span>Advertising Revenue & Performance Analytics</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time tracking of impressions, clicks, click-through rates (CTR), and network earnings
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold border border-neutral-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Earnings */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Estimated Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            ${summary.totalEstimatedEarnings.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <ArrowUpRight className="w-3 h-3" />
            <span>Across all active ad networks</span>
          </div>
        </div>

        {/* Total Impressions */}
        <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Impressions
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {summary.totalImpressions.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500">
            {summary.activeSlotsCount} active slots serving
          </div>
        </div>

        {/* Ad Clicks */}
        <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Clicks
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <MousePointer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {summary.totalClicks.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500">
            Direct user sponsor engagements
          </div>
        </div>

        {/* Overall CTR */}
        <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Average CTR
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {summary.overallCtr.toFixed(2)}%
          </div>
          <div className="text-[11px] text-emerald-400">
            High performance monetization
          </div>
        </div>
      </div>

      {/* Network & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Ad Network */}
        <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-red-500" />
            <span>Revenue by Advertising Network</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(byNetwork).map(([network, data]) => {
              const share = summary.totalEstimatedEarnings > 0
                ? ((data.earnings / summary.totalEstimatedEarnings) * 100)
                : 0;

              return (
                <div key={network} className="space-y-1.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white uppercase tracking-wider">
                      {network === 'adsense'
                        ? 'Google AdSense'
                        : network === 'admanager'
                        ? 'Google Ad Manager'
                        : network === 'monetag'
                        ? 'Monetag'
                        : network === 'adsterra'
                        ? 'Adsterra'
                        : 'Custom Direct / HTML'}
                    </span>
                    <span className="font-extrabold text-emerald-400">
                      ${data.earnings.toFixed(2)} ({share.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(8, share))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-0.5">
                    <span>{data.impressions.toLocaleString()} views</span>
                    <span>{data.clicks.toLocaleString()} clicks</span>
                    <span>{data.count} ad slots</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Device Breakdown */}
        <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" />
            <span>Revenue & Engagement by Device</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Desktop */}
            <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <Monitor className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Desktop & Laptop</h4>
              <div className="text-xl font-black text-emerald-400">
                ${byDevice.desktop.earnings.toFixed(2)}
              </div>
              <div className="text-xs text-neutral-400 space-y-0.5 pt-1">
                <div>{byDevice.desktop.impressions.toLocaleString()} impressions</div>
                <div>{byDevice.desktop.clicks.toLocaleString()} clicks</div>
              </div>
            </div>

            {/* Mobile */}
            <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Mobile & Tablet</h4>
              <div className="text-xl font-black text-emerald-400">
                ${byDevice.mobile.earnings.toFixed(2)}
              </div>
              <div className="text-xs text-neutral-400 space-y-0.5 pt-1">
                <div>{byDevice.mobile.impressions.toLocaleString()} impressions</div>
                <div>{byDevice.mobile.clicks.toLocaleString()} clicks</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-400">
            <span className="font-bold text-neutral-300">Monetization Insight:</span> Desktop users generate higher CPMs on sidebar half-page and top leaderboard placements, while mobile users provide solid CTR on between-section billboard banners.
          </div>
        </div>
      </div>

      {/* 7-Day Performance Timeline Report */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-500" />
          <span>7-Day Daily Revenue & Performance Breakdown</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950 text-[11px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Impressions</th>
                <th className="py-3 px-4">Clicks</th>
                <th className="py-3 px-4">CTR</th>
                <th className="py-3 px-4 text-right">Est. Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {dailyReports.map(day => {
                const dayCtr = day.impressions > 0 ? ((day.clicks / day.impressions) * 100).toFixed(2) : '0.00';
                return (
                  <tr key={day.date} className="hover:bg-neutral-900/40">
                    <td className="py-3 px-4 font-mono font-medium text-white">{day.date}</td>
                    <td className="py-3 px-4">{day.impressions.toLocaleString()}</td>
                    <td className="py-3 px-4">{day.clicks.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-amber-400">{dayCtr}%</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                      ${day.earnings.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
