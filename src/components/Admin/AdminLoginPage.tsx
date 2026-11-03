import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, KeyRound, Film } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { api } from '../../services/api.ts';
import { AdminUser } from '../../types.ts';

interface AdminLoginPageProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onBackHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackHome
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.adminLogin(username.trim(), password.trim());
      onLoginSuccess(res.admin);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.18),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(23,23,23,0.9),_transparent_60%)]" />

      <motion.div
        className="relative w-full max-w-md z-10"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, filter: 'blur(8px)' }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.45, ease }}
      >
        <div className="bg-neutral-950/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/30 text-red-500 mx-auto flex items-center justify-center shadow-lg shadow-red-950/30">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Admin Portal</h1>
              <p className="text-xs text-neutral-400 mt-1">
                Sign in with your admin credentials to manage the catalog.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  placeholder="Enter admin username"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-red-950 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={onBackHome}
            className="w-full flex items-center justify-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer pt-1"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Back to CineStream</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
