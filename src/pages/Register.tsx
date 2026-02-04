import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Register() {
  const navigate = useNavigate();
  const { signUpWithPassword, resendSignupConfirmation, authMode } = useAuthStore();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setShowResend(false);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsSubmitting(true);
    const res = await signUpWithPassword(email.trim(), password, username.trim() || undefined);
    setIsSubmitting(false);
    if (res.error) {
      console.error('Registration error:', res.error);
      setError(typeof res.error === 'string' ? res.error : JSON.stringify(res.error));
      return;
    }
    if (res.needsEmailConfirmation) {
      setInfo('Check your inbox and confirm your email to finish creating your account.');
      setShowResend(true);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-white flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-black60 border border-white/10 rounded-2xl p-5">
        <h1 className="text-xl font-bold mb-4">Register</h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-white/70">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary/50"
              placeholder="username"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/70">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary/50"
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black40 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary/50"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {error && <div className="text-xs text-rose-300">{error}</div>}
          {info && <div className="text-xs text-white/70">{info}</div>}

          {showResend && (
            <button
              type="button"
              disabled={isResending}
              className="w-full bg-transparent10 border border-white/10 rounded-xl py-2 text-sm disabled:opacity-60"
              onClick={async () => {
                const trimmed = email.trim();
                if (!trimmed) {
                  setError('Introdu email-ul mai întâi.');
                  return;
                }
                setError(null);
                setInfo(null);
                setIsResending(true);
                try {
                  const res = await resendSignupConfirmation(trimmed);
                  if (res.error) {
                    setError(res.error);
                    return;
                  }
                  setInfo('Email de confirmare trimis din nou. Verifică Inbox și Spam.');
                } finally {
                  setIsResending(false);
                }
              }}
            >
              {isResending ? 'Sending...' : 'Resend confirmation email'}
            </button>
          )}

          <div className="text-[10px] text-white/40 text-center">
            Auth: {authMode}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-secondary text-black font-bold rounded-xl py-2 text-sm disabled:opacity-60"
          >
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-xs text-white/70">
          <Link to="/login" className="text-secondary hover:underline">
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
}
