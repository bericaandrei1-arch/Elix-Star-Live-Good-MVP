import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function CreatorLoginDetails() {
  const navigate = useNavigate();
  const { user, signInWithPassword, signUpWithPassword, signOut, resendSignupConfirmation, authMode } = useAuthStore();
  const [rememberMe, setRememberMe] = useState(true);
  const [saveDetails, setSaveDetails] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [savedIdentifier, setSavedIdentifier] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [savedPassword, setSavedPassword] = useState('');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const storedRemember = window.localStorage.getItem('auth_remember_me');
    setRememberMe(storedRemember === null ? true : storedRemember === 'true');
    const storedSave = window.localStorage.getItem('creator_save_login_details') === 'true';
    setSaveDetails(storedSave);
    const storedSavePassword = window.localStorage.getItem('creator_save_password') === 'true';
    setSavePassword(storedSavePassword);
    const identifier = window.localStorage.getItem('creator_saved_identifier') ?? '';
    const savedName = window.localStorage.getItem('creator_saved_username') ?? '';
    const storedPassword = window.localStorage.getItem('creator_saved_password') ?? '';
    setSavedIdentifier(identifier);
    setSavedUsername(savedName);
    setSavedPassword(storedPassword);
    setEmail(identifier);
    setUsername(savedName);
    if (storedSavePassword && storedPassword) {
      setPassword(storedPassword);
    }
  }, []);

  const persistSavedDetails = (nextEmail: string, nextUsername: string) => {
    const shouldSave = window.localStorage.getItem('creator_save_login_details') === 'true';
    if (!shouldSave) return;
    window.localStorage.setItem('creator_saved_identifier', nextEmail);
    window.localStorage.setItem('creator_saved_username', nextUsername);
    setSavedIdentifier(nextEmail);
    setSavedUsername(nextUsername);
  };

  const persistSavedPassword = (nextPassword: string) => {
    const shouldSave = window.localStorage.getItem('creator_save_password') === 'true';
    if (!shouldSave) return;
    window.localStorage.setItem('creator_saved_password', nextPassword);
    setSavedPassword(nextPassword);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setShowResend(false);
    setIsSubmitting(true);

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          setError('Parola trebuie să aibă minim 6 caractere.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Parolele nu coincid.');
          return;
        }
        const res = await signUpWithPassword(trimmedEmail, password, trimmedUsername || undefined);
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.needsEmailConfirmation) {
          setInfo('Check your inbox and confirm your email to finish creating your account.');
          setShowResend(true);
          persistSavedDetails(trimmedEmail, trimmedUsername || trimmedEmail.split('@')[0]);
          return;
        }
        persistSavedDetails(trimmedEmail, trimmedUsername || trimmedEmail.split('@')[0]);
        persistSavedPassword(password);
        navigate('/profile', { replace: true });
        return;
      }

      const res = await signInWithPassword(trimmedEmail, password);
      if (res.error) {
        const msg = res.error;
        if (msg.toLowerCase().includes('email not confirmed')) {
          setError('Email neconfirmat. Verifică inbox-ul și confirmă contul, apoi încearcă din nou.');
          setShowResend(true);
          return;
        }
        setError(msg);
        if (/confirm|verification|verify|email/i.test(msg)) {
          setShowResend(true);
        }
        return;
      }
      persistSavedDetails(trimmedEmail, trimmedUsername || savedUsername || trimmedEmail.split('@')[0]);
      persistSavedPassword(password);
      navigate('/profile', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Introdu email-ul mai întâi.');
      return;
    }
    setError(null);
    setInfo(null);
    setIsResending(true);
    try {
      const res = await resendSignupConfirmation(trimmedEmail);
      if (res.error) {
        setError(res.error);
        return;
      }
      setInfo('Email de confirmare trimis din nou. Verifică Inbox și Spam.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 flex justify-center">
      <div className="w-full max-w-[500px]">
        <header className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)}><ArrowLeft size={24} /></button>
          <h1 className="font-bold text-lg">Creator Login Details</h1>
          <div className="w-6" />
        </header>

        {!user && (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
                setInfo(null);
                setShowResend(false);
              }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                mode === 'signin'
                  ? 'bg-[#E6B36A] text-black border-[#E6B36A]'
                  : 'bg-transparent5 text-white border-white/10 hover:bg-transparent10'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
                setInfo(null);
                setShowResend(false);
              }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                mode === 'signup'
                  ? 'bg-[#E6B36A] text-black border-[#E6B36A]'
                  : 'bg-transparent5 text-white border-white/10 hover:bg-transparent10'
              }`}
            >
              Create account
            </button>
          </div>
        )}

        {!user && (
          <form onSubmit={onSubmit} className="space-y-3 mb-6">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs text-white/70">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-secondary/50"
                    placeholder="creator_name"
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-white/70">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-secondary/50"
                  placeholder="you@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/70">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black40 border border-white/10 rounded-xl pl-9 pr-9 py-2 text-sm outline-none focus:border-secondary/50"
                  placeholder="••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs text-white/70">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black40 border border-white/10 rounded-xl pl-9 pr-9 py-2 text-sm outline-none focus:border-secondary/50"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {error && <div className="text-xs text-rose-300">{error}</div>}
            {info && <div className="text-xs text-white/70">{info}</div>}

            {showResend && (
              <button
                type="button"
                disabled={isResending}
                className="w-full bg-transparent10 border border-white/10 rounded-xl py-2 text-sm disabled:opacity-60"
                onClick={onResend}
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
              {mode === 'signup'
                ? isSubmitting
                  ? 'Creating...'
                  : 'Create account'
                : isSubmitting
                  ? 'Signing in...'
                  : 'Sign in'}
            </button>
          </form>
        )}

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-transparent5 border border-white/10 rounded-xl">
            <span className="text-sm">Remember me</span>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => {
                const next = e.target.checked;
                setRememberMe(next);
                window.localStorage.setItem('auth_remember_me', next ? 'true' : 'false');
              }}
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-transparent5 border border-white/10 rounded-xl">
            <span className="text-sm">Save login details (email/username)</span>
            <input
              type="checkbox"
              checked={saveDetails}
              onChange={(e) => {
                const next = e.target.checked;
                setSaveDetails(next);
                window.localStorage.setItem('creator_save_login_details', next ? 'true' : 'false');
                if (!next) {
                  window.localStorage.removeItem('creator_saved_identifier');
                  window.localStorage.removeItem('creator_saved_username');
                  setSavedIdentifier('');
                  setSavedUsername('');
                }
              }}
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-transparent5 border border-white/10 rounded-xl">
            <span className="text-sm">Save password</span>
            <input
              type="checkbox"
              checked={savePassword}
              onChange={(e) => {
                const next = e.target.checked;
                setSavePassword(next);
                window.localStorage.setItem('creator_save_password', next ? 'true' : 'false');
                if (!next) {
                  window.localStorage.removeItem('creator_saved_password');
                  setSavedPassword('');
                }
              }}
            />
          </label>

          <div className="p-4 bg-transparent5 border border-white/10 rounded-xl">
            <div className="text-xs text-white/60">Saved email</div>
            <div className="text-sm break-all">{savedIdentifier || '-'}</div>
            <div className="mt-3 text-xs text-white/60">Saved username</div>
            <div className="text-sm break-all">{savedUsername || '-'}</div>
            <div className="mt-3 text-xs text-white/60">Saved password</div>
            <div className="text-sm break-all">{savedPassword ? '••••••••' : '-'}</div>

            <button
              className="mt-4 w-full bg-transparent10 border border-white/10 rounded-xl py-2 text-sm"
              onClick={() => {
                window.localStorage.removeItem('creator_saved_identifier');
                window.localStorage.removeItem('creator_saved_username');
                window.localStorage.removeItem('creator_saved_password');
                setSavedIdentifier('');
                setSavedUsername('');
                setSavedPassword('');
              }}
            >
              Clear saved details
            </button>

            {user && (
              <button
                className="mt-3 w-full bg-[#E6B36A] text-black rounded-xl py-2 text-sm font-semibold"
                onClick={() => {
                  const nextEmail = user.email;
                  const nextUsername = user.username;
                  window.localStorage.setItem('creator_saved_identifier', nextEmail);
                  window.localStorage.setItem('creator_saved_username', nextUsername);
                  setSavedIdentifier(nextEmail);
                  setSavedUsername(nextUsername);
                  window.localStorage.setItem('creator_save_login_details', 'true');
                  setSaveDetails(true);
                }}
              >
                Save my current account
              </button>
            )}
          </div>

          {user && (
            <button
              className="w-full bg-transparent10 border border-white/10 rounded-xl py-2 text-sm"
              onClick={async () => {
                await signOut();
                setPassword('');
                setConfirmPassword('');
                setMode('signin');
                navigate('/creator/login-details', { replace: true });
              }}
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
